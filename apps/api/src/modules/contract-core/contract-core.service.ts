import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { ApprovalService } from '../../app/approval.service.js';
import { ApprovalPolicyService } from '../../app/approval-policy.service.js';
import type { AuthContext, RequestAuditContext } from '../../app/auth-context.js';
import { ResourceAccessService } from '../../app/resource-access.service.js';
import { AuditService } from '../audit-observability/audit.service.js';
import { ContractCoreRepository } from './contract-core.repository.js';

const jsonSchema = z.custom<Prisma.InputJsonValue | undefined>(
  (value) => value === undefined || value === null || typeof value === 'object' || Array.isArray(value),
  { message: 'Expected JSON-compatible metadata.' }
);

const createContractSchema = z.object({
  dealId: z.string().min(1),
  contractType: z.enum(['master_purchase', 'supply_agreement', 'annex', 'custom']),
  title: z.string().min(1).max(200),
  metadata: jsonSchema.optional()
});

const createContractVersionSchema = z.object({
  label: z.string().min(1).max(120).optional(),
  storageBucket: z.string().min(1).max(120).optional(),
  storageKey: z.string().min(1).max(500).optional(),
  createdByUserId: z.string().min(1).optional()
});

const updateContractStatusSchema = z.object({
  status: z.enum(['draft', 'active', 'archived'])
});

@Injectable()
export class ContractCoreService {
  constructor(
    @Inject(ContractCoreRepository) private readonly contractCoreRepository: ContractCoreRepository,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(ApprovalService) private readonly approvalService: ApprovalService,
    @Inject(ApprovalPolicyService) private readonly approvalPolicyService: ApprovalPolicyService,
    @Inject(ResourceAccessService) private readonly resourceAccessService: ResourceAccessService
  ) {}

  async listContracts(authContext: AuthContext) {
    const contracts = await this.contractCoreRepository.listContracts();
    return this.resourceAccessService.filterByTenant(authContext, contracts, (contract) => contract.deal?.tenantId);
  }

  async getContractById(id: string, authContext: AuthContext) {
    await this.resourceAccessService.ensureContractAccess(authContext, id);
    return this.contractCoreRepository.getContractById(id);
  }

  async createContract(input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    const parsed = createContractSchema.parse(input);
    await this.resourceAccessService.ensureDealAccess(authContext, parsed.dealId);
    const contract = await this.contractCoreRepository.createContract(parsed);

    await this.auditService.record({
      module: 'contract-core',
      eventType: 'contract.created',
      actorId: auditContext.actorId,
      tenantId: contract.deal.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'contract',
      subjectId: contract.id,
      payload: {
        dealId: contract.dealId,
        contractType: contract.contractType,
        title: contract.title
      }
    });

    return contract;
  }

  async createContractVersion(
    contractId: string,
    input: unknown,
    auditContext: RequestAuditContext,
    authContext: AuthContext
  ) {
    await this.resourceAccessService.ensureContractAccess(authContext, contractId);
    const version = await this.contractCoreRepository.createContractVersion({
      contractId,
      ...createContractVersionSchema.parse(input)
    });

    await this.auditService.record({
      module: 'contract-core',
      eventType: 'contract.version.created',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'contract-version',
      subjectId: version.id,
      payload: {
        contractId,
        versionNumber: version.versionNumber,
        label: version.label,
        storageBucket: version.storageBucket,
        storageKey: version.storageKey
      }
    });

    return version;
  }

  async updateContractStatus(
    id: string,
    input: unknown,
    auditContext: RequestAuditContext,
    authContext: AuthContext,
    options: { skipApproval?: boolean } = {}
  ) {
    await this.resourceAccessService.ensureContractAccess(authContext, id);
    const parsed = updateContractStatusSchema.parse(input);
    const approvalRule = this.approvalPolicyService.getRule('contract.status.activate');

    if (!options.skipApproval && parsed.status === 'active' && approvalRule?.enabled) {
      const pendingApproval = await this.approvalService.getPendingBySubject('contract', id, 'contract.status.activate');

      if (pendingApproval) {
        return {
          status: 'pending_approval',
          approval: pendingApproval
        };
      }

      const existingContract = await this.contractCoreRepository.getContractById(id);
      const approval = await this.approvalService.create({
        module: 'contract-core',
        approvalType: 'contract.status.activate',
        tenantId: existingContract.deal.tenantId,
        subjectType: 'contract',
        subjectId: id,
        requestedByUserId: auditContext.actorId,
        requiredRoleCode: approvalRule.requiredRoleCode,
        reason: approvalRule.reason,
        payload: parsed
      });

      await this.auditService.record({
        module: 'admin-core',
        eventType: 'approval.requested',
        actorId: auditContext.actorId,
        tenantId: existingContract.deal.tenantId,
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

    const contract = await this.contractCoreRepository.updateContractStatus(id, parsed.status);

    await this.auditService.record({
      module: 'contract-core',
      eventType: 'contract.status.updated',
      actorId: auditContext.actorId,
      tenantId: contract.deal.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'contract',
      subjectId: contract.id,
      payload: {
        status: contract.status
      }
    });

    return contract;
  }
}
