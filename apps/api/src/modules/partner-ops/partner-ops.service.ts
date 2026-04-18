import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import type { AuthContext, RequestAuditContext } from '../../app/auth-context.js';
import { ResourceAccessService } from '../../app/resource-access.service.js';
import { AuditService } from '../audit-observability/audit.service.js';
import { ComplianceCoreService } from '../compliance-core/compliance-core.service.js';
import { NotificationService } from '../notifications-core/notification.service.js';
import { PartnerOpsRepository, type AssignmentKind } from './partner-ops.repository.js';

const assignmentKinds = z.enum(['shipment', 'customs']);
const createAssignmentSchema = z.object({
  tenantId: z.string().min(1),
  kind: assignmentKinds,
  subjectType: z.string().min(1).max(120),
  subjectId: z.string().min(1).max(120),
  partnerOrganizationId: z.string().min(1).optional(),
  partnerUserId: z.string().min(1).optional(),
  reference: z.string().min(1).max(120).optional(),
  status: z.string().min(1).max(80).optional(),
  notes: z.string().max(1000).optional(),
  metadata: z.unknown().optional()
});

const updateAssignmentSchema = z.object({
  partnerOrganizationId: z.string().min(1).nullable().optional(),
  partnerUserId: z.string().min(1).nullable().optional(),
  reference: z.string().min(1).max(120).nullable().optional(),
  status: z.string().min(1).max(80).optional(),
  notes: z.string().max(1000).nullable().optional(),
  metadata: z.unknown().nullable().optional()
});

const listAssignmentsSchema = z.object({
  tenantId: z.string().min(1).optional(),
  kind: assignmentKinds.optional()
});

@Injectable()
export class PartnerOpsService {
  constructor(
    @Inject(PartnerOpsRepository) private readonly partnerOpsRepository: PartnerOpsRepository,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(NotificationService) private readonly notificationService: NotificationService,
    @Inject(ComplianceCoreService) private readonly complianceCoreService: ComplianceCoreService,
    @Inject(ResourceAccessService) private readonly resourceAccessService: ResourceAccessService
  ) {}

  async listAssignments(authContext: AuthContext, query: unknown) {
    const { tenantId, kind } = listAssignmentsSchema.parse(query);
    const targetTenantIds = tenantId ? [tenantId] : authContext.tenantIds;

    const assignments = await Promise.all(
      targetTenantIds.map((tenant) => this.partnerOpsRepository.listAssignments(tenant, kind as AssignmentKind | undefined))
    );

    const flattened = assignments.flat();
    if (this.resourceAccessService.isPlatformAdmin(authContext)) {
      return { items: flattened };
    }

    const internalUserId = authContext.internalUserId;
    const accessibleAssignments = flattened.filter((assignment) => {
      if (internalUserId && assignment.partnerUserId === internalUserId) {
        return true;
      }

      return Boolean(
        assignment.partnerOrganization &&
        authContext.tenantIds.includes(assignment.tenantId) &&
        assignment.partnerOrganization.memberships?.some((membership: { userId: string }) => membership.userId === internalUserId)
      );
    });

    return { items: accessibleAssignments };
  }

  async getAssignmentById(id: string, authContext: AuthContext) {
    const assignment = await this.partnerOpsRepository.getAssignmentById(id);

    if (this.resourceAccessService.isPlatformAdmin(authContext)) {
      return assignment;
    }

    if (!this.canAccessAssignment(assignment, authContext)) {
      throw new ForbiddenException('Access to this assignment is not allowed.');
    }

    return assignment;
  }

  async createAssignment(input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    this.ensureAdmin(authContext);
    const parsed = createAssignmentSchema.parse(input);
    const assignment = await this.partnerOpsRepository.createAssignment({
      ...parsed,
      metadata: parsed.metadata as Prisma.InputJsonValue | undefined
    });

    await this.auditService.record({
      module: 'partner-ops',
      eventType: `${parsed.kind}.assignment.created`,
      actorId: auditContext.actorId,
      tenantId: parsed.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'operational-assignment',
      subjectId: assignment.id,
      payload: {
        kind: assignment.kind,
        subjectType: assignment.subjectType,
        subjectId: assignment.subjectId,
        partnerOrganizationId: assignment.partnerOrganizationId,
        partnerUserId: assignment.partnerUserId,
        status: assignment.status
      }
    });

    await this.notifyAssignmentChange(assignment.id, assignment.kind, assignment.partnerOrganizationId, assignment.partnerUserId, 'created');

    return assignment;
  }

  async updateAssignment(id: string, input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    this.ensureAdmin(authContext);
    const parsed = updateAssignmentSchema.parse(input);
    const existing = await this.partnerOpsRepository.getAssignmentById(id);
    const assignment = await this.partnerOpsRepository.updateAssignment({
      assignmentId: id,
      tenantId: existing.tenantId,
      ...parsed,
      metadata: parsed.metadata as Prisma.InputJsonValue | null | undefined
    });

    await this.auditService.record({
      module: 'partner-ops',
      eventType: `${assignment.kind}.assignment.updated`,
      actorId: auditContext.actorId,
      tenantId: assignment.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'operational-assignment',
      subjectId: assignment.id,
      payload: {
        partnerOrganizationId: assignment.partnerOrganizationId,
        partnerUserId: assignment.partnerUserId,
        status: assignment.status,
        reference: assignment.reference
      }
    });

    await this.notifyAssignmentChange(assignment.id, assignment.kind, assignment.partnerOrganizationId, assignment.partnerUserId, 'updated');

    return assignment;
  }

  async updateAssignmentStatus(id: string, input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    const parsed = z.object({ status: z.string().min(1).max(80) }).parse(input);
    const existing = await this.partnerOpsRepository.getAssignmentById(id);

    const requiredPermission = existing.kind === 'shipment' ? 'logistics.manage' : 'customs.manage';
    if (!this.resourceAccessService.isPlatformAdmin(authContext) && !authContext.permissions.includes(requiredPermission)) {
      throw new ForbiddenException(`Missing required permission: ${requiredPermission}`);
    }

    if (!this.resourceAccessService.isPlatformAdmin(authContext) && !this.canAccessAssignment(existing, authContext)) {
      throw new ForbiddenException('Access to this assignment is not allowed.');
    }

    if (!this.resourceAccessService.isPlatformAdmin(authContext)) {
      await this.complianceCoreService.requirePartnerApproval(
        authContext,
        existing.kind === 'shipment' ? 'logistics' : 'customs'
      );
    }

    const assignment = await this.partnerOpsRepository.updateAssignment({
      assignmentId: id,
      tenantId: existing.tenantId,
      status: parsed.status
    });

    await this.auditService.record({
      module: 'partner-ops',
      eventType: `${assignment.kind}.assignment.status.updated`,
      actorId: auditContext.actorId,
      tenantId: assignment.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'operational-assignment',
      subjectId: assignment.id,
      payload: {
        status: assignment.status
      }
    });

    await this.notifyAssignmentChange(assignment.id, assignment.kind, assignment.partnerOrganizationId, assignment.partnerUserId, 'status.updated');

    return assignment;
  }

  async listOrganizations(authContext: AuthContext, query: unknown) {
    this.ensureAdmin(authContext);
    const parsed = z.object({ tenantId: z.string().min(1).optional() }).parse(query);
    const tenantId = parsed.tenantId ?? authContext.tenantId ?? authContext.tenantIds[0];

    if (!tenantId) {
      throw new NotFoundException('Tenant context is required.');
    }

    return {
      items: await this.partnerOpsRepository.listPartnerOrganizations(tenantId, [])
    };
  }

  private ensureAdmin(authContext: AuthContext) {
    if (!this.resourceAccessService.isPlatformAdmin(authContext)) {
      throw new ForbiddenException('Admin access is required.');
    }
  }

  private canAccessAssignment(assignment: { partnerOrganizationId: string | null; tenantId: string }, authContext: AuthContext) {
    if (this.resourceAccessService.isPlatformAdmin(authContext)) {
      return true;
    }

    return Boolean(authContext.internalUserId) && authContext.tenantIds.includes(assignment.tenantId);
  }

  private async notifyAssignmentChange(
    assignmentId: string,
    kind: AssignmentKind,
    partnerOrganizationId: string | null,
    partnerUserId: string | null,
    reason: 'created' | 'updated' | 'status.updated'
  ) {
    const organization = partnerOrganizationId
      ? await this.partnerOpsRepository.getPartnerUsers(partnerOrganizationId)
      : [];
    const userIds = new Set<string>(organization.map((membership: { userId: string }) => membership.userId));

    if (partnerUserId) {
      userIds.add(partnerUserId);
    }

    const title = kind === 'shipment' ? 'Shipment assignment updated' : 'Customs assignment updated';
    const message = `Assignment ${assignmentId} was ${reason}.`;

    if (userIds.size) {
      await this.notificationService.emitMany([...userIds], {
        type: `assignment.${reason}`,
        title,
        message,
        entityType: 'operational-assignment',
        entityId: assignmentId,
        metadata: {
          kind,
          reason
        }
      });
    }
  }
}
