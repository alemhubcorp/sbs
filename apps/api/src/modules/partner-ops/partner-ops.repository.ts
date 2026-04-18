import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../app/prisma.service.js';

export type AssignmentKind = 'shipment' | 'customs';

export interface CreateAssignmentRecordInput {
  tenantId: string;
  kind: AssignmentKind;
  subjectType: string;
  subjectId: string;
  partnerOrganizationId?: string | undefined;
  partnerUserId?: string | undefined;
  reference?: string | undefined;
  status?: string | undefined;
  notes?: string | undefined;
  metadata?: Prisma.InputJsonValue | undefined;
}

export interface UpdateAssignmentRecordInput {
  assignmentId: string;
  tenantId: string;
  partnerOrganizationId?: string | null | undefined;
  partnerUserId?: string | null | undefined;
  reference?: string | null | undefined;
  status?: string | undefined;
  notes?: string | null | undefined;
  metadata?: Prisma.InputJsonValue | null | undefined;
}

@Injectable()
export class PartnerOpsRepository {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async listAssignments(tenantId: string, kind?: AssignmentKind) {
    const prisma = this.prismaService.client as any;
    return prisma.operationalAssignment.findMany({
      where: {
        tenantId,
        ...(kind ? { kind } : {})
      },
      include: {
        tenant: true,
        partnerOrganization: {
          include: {
            memberships: true
          }
        },
        partnerUser: true
      },
      orderBy: [{ createdAt: 'desc' }]
    });
  }

  async getAssignmentById(id: string) {
    const prisma = this.prismaService.client as any;
    const assignment = await prisma.operationalAssignment.findUnique({
      where: { id },
      include: {
        tenant: true,
        partnerOrganization: {
          include: {
            memberships: true
          }
        },
        partnerUser: true
      }
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment ${id} was not found.`);
    }

    return assignment;
  }

  async createAssignment(input: CreateAssignmentRecordInput) {
    await this.ensurePartnerOrganizationIfProvided(input.tenantId, input.partnerOrganizationId, input.kind);

    const prisma = this.prismaService.client as any;
    return prisma.operationalAssignment.create({
      data: {
        tenantId: input.tenantId,
        kind: input.kind,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        partnerOrganizationId: input.partnerOrganizationId ?? null,
        partnerUserId: input.partnerUserId ?? null,
        reference: input.reference ?? null,
        status: input.status ?? this.defaultStatusForKind(input.kind),
        notes: input.notes ?? null,
        metadata: input.metadata ?? Prisma.JsonNull
      },
      include: {
        tenant: true,
        partnerOrganization: {
          include: {
            memberships: true
          }
        },
        partnerUser: true
      }
    });
  }

  async updateAssignment(input: UpdateAssignmentRecordInput) {
    const existing = await this.getAssignmentById(input.assignmentId);
    if (existing.tenantId !== input.tenantId) {
      throw new ForbiddenException(`Assignment ${input.assignmentId} is not in tenant ${input.tenantId}.`);
    }

    const prisma = this.prismaService.client as any;

    if (input.partnerOrganizationId != null) {
      await this.ensurePartnerOrganizationIfProvided(input.tenantId, input.partnerOrganizationId, existing.kind);
    }

    const data: Record<string, unknown> = {};

    if (input.partnerOrganizationId !== undefined) {
      data.partnerOrganization = input.partnerOrganizationId ? { connect: { id: input.partnerOrganizationId } } : { disconnect: true };
    }

    if (input.partnerUserId !== undefined) {
      data.partnerUser = input.partnerUserId ? { connect: { id: input.partnerUserId } } : { disconnect: true };
    }

    if (input.reference !== undefined) {
      data.reference = input.reference;
    }

    if (input.status !== undefined) {
      data.status = input.status;
    }

    if (input.notes !== undefined) {
      data.notes = input.notes;
    }

    if (input.metadata !== undefined) {
      data.metadata = input.metadata;
    }

    return prisma.operationalAssignment.update({
      where: { id: input.assignmentId },
      data,
      include: {
        tenant: true,
        partnerOrganization: true,
        partnerUser: true
      }
    });
  }

  async listPartnerOrganizations(tenantId: string, partnerTypes: string[]) {
    const prisma = this.prismaService.client as any;
    return prisma.organization.findMany({
      where: {
        tenantId,
        ...(partnerTypes.length ? { partnerType: { in: partnerTypes as any } } : {})
      },
      orderBy: [{ createdAt: 'desc' }]
    });
  }

  async getPartnerUsers(organizationId: string) {
    const prisma = this.prismaService.client as any;
    return prisma.membership.findMany({
      where: {
        organizationId,
        status: 'active'
      },
      include: {
        user: true,
        organization: true
      },
      orderBy: [{ createdAt: 'asc' }]
    });
  }

  private defaultStatusForKind(kind: AssignmentKind) {
    return kind === 'shipment' ? 'accepted' : 'documents_requested';
  }

  private async ensurePartnerOrganizationIfProvided(tenantId: string, organizationId: string | undefined, kind: AssignmentKind) {
    if (!organizationId) {
      return;
    }

    const prisma = this.prismaService.client as any;
    const organization = await prisma.organization.findFirst({
      where: { id: organizationId, tenantId },
      select: {
        id: true,
        partnerType: true
      }
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${organizationId} was not found in tenant ${tenantId}.`);
    }

    const allowedPartnerTypes =
      kind === 'shipment' ? ['logistics_company'] : ['customs_broker'];

    if (organization.partnerType && !allowedPartnerTypes.includes(organization.partnerType)) {
      throw new ForbiddenException(`Organization ${organizationId} is not valid for ${kind} assignments.`);
    }
  }
}
