import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { ApprovalService } from '../../app/approval.service.js';
import { ApprovalPolicyService } from '../../app/approval-policy.service.js';
import type { AuthContext, RequestAuditContext } from '../../app/auth-context.js';
import { ResourceAccessService } from '../../app/resource-access.service.js';
import { AuditService } from '../audit-observability/audit.service.js';
import { LogisticsCoreRepository } from './logistics-core.repository.js';

const jsonSchema = z.custom<Prisma.InputJsonValue | undefined>(
  (value) => value === undefined || value === null || typeof value === 'object' || Array.isArray(value),
  { message: 'Expected JSON-compatible capability data.' }
);

const createProviderSchema = z.object({
  name: z.string().min(1).max(160),
  contactEmail: z.string().email().optional()
});

const updateProviderStatusSchema = z.object({
  status: z.enum(['draft', 'active', 'suspended'])
});

const upsertCapabilityProfileSchema = z.object({
  transportTypes: jsonSchema.optional(),
  serviceTypes: jsonSchema.optional(),
  cargoCategories: jsonSchema.optional(),
  supportedRegions: jsonSchema.optional(),
  deliveryModes: jsonSchema.optional(),
  additionalServices: jsonSchema.optional()
});

const selectProviderSchema = z.object({
  logisticsProviderId: z.string().min(1),
  notes: z.string().min(1).max(500).optional()
});

@Injectable()
export class LogisticsCoreService {
  constructor(
    @Inject(LogisticsCoreRepository) private readonly logisticsCoreRepository: LogisticsCoreRepository,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(ApprovalService) private readonly approvalService: ApprovalService,
    @Inject(ApprovalPolicyService) private readonly approvalPolicyService: ApprovalPolicyService,
    @Inject(ResourceAccessService) private readonly resourceAccessService: ResourceAccessService
  ) {}

  listProviders(authContext: AuthContext) {
    if (this.resourceAccessService.isPlatformAdmin(authContext)) {
      return this.logisticsCoreRepository.listProviders();
    }

    return [];
  }

  async getProviderById(id: string, authContext: AuthContext) {
    if (!this.resourceAccessService.isPlatformAdmin(authContext)) {
      throw new ForbiddenException('Access to logistics providers is restricted.');
    }

    return this.logisticsCoreRepository.getProviderById(id);
  }

  async createProvider(input: unknown, auditContext: RequestAuditContext) {
    const provider = await this.logisticsCoreRepository.createProvider(createProviderSchema.parse(input));
    await this.auditService.record({
      module: 'logistics-core',
      eventType: 'logistics.provider.created',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'logistics-provider',
      subjectId: provider.id,
      payload: { name: provider.name, status: provider.status }
    });
    return provider;
  }

  async updateProviderStatus(id: string, input: unknown, auditContext: RequestAuditContext) {
    const provider = await this.logisticsCoreRepository.updateProviderStatus(
      id,
      updateProviderStatusSchema.parse(input).status
    );
    await this.auditService.record({
      module: 'logistics-core',
      eventType: 'logistics.provider.status.updated',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'logistics-provider',
      subjectId: provider.id,
      payload: { status: provider.status }
    });
    return provider;
  }

  async upsertCapabilityProfile(id: string, input: unknown, auditContext: RequestAuditContext) {
    const profile = await this.logisticsCoreRepository.upsertCapabilityProfile({
      providerId: id,
      ...upsertCapabilityProfileSchema.parse(input)
    });
    await this.auditService.record({
      module: 'logistics-core',
      eventType: 'logistics.capability-profile.upserted',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'logistics-capability-profile',
      subjectId: profile.id,
      payload: { providerId: profile.providerId }
    });
    return profile;
  }

  async selectProviderForDeal(
    dealId: string,
    input: unknown,
    auditContext: RequestAuditContext,
    authContext: AuthContext,
    options: { skipApproval?: boolean } = {}
  ) {
    await this.resourceAccessService.ensureDealAccess(authContext, dealId);
    const parsed = selectProviderSchema.parse(input);
    const approvalRule = this.approvalPolicyService.getRule('logistics.deal.selection');

    if (!options.skipApproval && approvalRule?.enabled) {
      const pendingApproval = await this.approvalService.getPendingBySubject(
        'wholesale-deal',
        dealId,
        'logistics.deal.selection'
      );

      if (pendingApproval) {
        return {
          status: 'pending_approval',
          approval: pendingApproval
        };
      }

      const deal = await this.logisticsCoreRepository.getDealForSelection(dealId);
      const approval = await this.approvalService.create({
        module: 'logistics-core',
        approvalType: 'logistics.deal.selection',
        tenantId: deal.tenantId,
        subjectType: 'wholesale-deal',
        subjectId: dealId,
        requestedByUserId: auditContext.actorId,
        requiredRoleCode: approvalRule.requiredRoleCode,
        reason: approvalRule.reason,
        payload: parsed
      });

      await this.auditService.record({
        module: 'admin-core',
        eventType: 'approval.requested',
        actorId: auditContext.actorId,
        tenantId: deal.tenantId,
        correlationId: auditContext.correlationId,
        subjectType: 'approval',
        subjectId: approval.id,
        payload: {
          approvalType: approval.approvalType,
          module: approval.module,
          requestedSubjectType: approval.subjectType,
          requestedSubjectId: approval.subjectId
        }
      });

      return {
        status: 'pending_approval',
        approval
      };
    }

    const selection = await this.logisticsCoreRepository.selectProviderForDeal({
      dealId,
      ...parsed
    });
    await this.auditService.record({
      module: 'logistics-core',
      eventType: 'logistics.deal.selection.updated',
      actorId: auditContext.actorId,
      tenantId: selection.deal.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'deal-logistics-selection',
      subjectId: selection.id,
      payload: {
        dealId,
        logisticsProviderId: selection.logisticsProviderId,
        status: selection.status
      }
    });
    return selection;
  }

  async getDealSelection(dealId: string, authContext: AuthContext) {
    await this.resourceAccessService.ensureDealAccess(authContext, dealId);
    return this.logisticsCoreRepository.getDealSelection(dealId);
  }
}
