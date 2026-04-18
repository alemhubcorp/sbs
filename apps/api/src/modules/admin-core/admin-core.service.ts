import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { AuthContext, RequestAuditContext } from '../../app/auth-context.js';
import { ApprovalService } from '../../app/approval.service.js';
import { ResourceAccessService } from '../../app/resource-access.service.js';
import { AuditService } from '../audit-observability/audit.service.js';
import { ComplianceCoreService } from '../compliance-core/compliance-core.service.js';
import { ContractCoreService } from '../contract-core/contract-core.service.js';
import { LogisticsCoreService } from '../logistics-core/logistics-core.service.js';
import { PaymentsEscrowCoreService } from '../payments-escrow-core/payments-escrow-core.service.js';
import { WholesaleCoreService } from '../wholesale-core/wholesale-core.service.js';

const approveSchema = z.object({
  comment: z.string().min(1).max(1000).optional()
});

const rejectSchema = z.object({
  comment: z.string().min(1).max(1000).optional()
});

@Injectable()
export class AdminCoreService {
  constructor(
    @Inject(ApprovalService) private readonly approvalService: ApprovalService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(ResourceAccessService) private readonly resourceAccessService: ResourceAccessService,
    @Inject(ComplianceCoreService) private readonly complianceCoreService: ComplianceCoreService,
    @Inject(WholesaleCoreService) private readonly wholesaleCoreService: WholesaleCoreService,
    @Inject(ContractCoreService) private readonly contractCoreService: ContractCoreService,
    @Inject(PaymentsEscrowCoreService) private readonly paymentsEscrowCoreService: PaymentsEscrowCoreService,
    @Inject(LogisticsCoreService) private readonly logisticsCoreService: LogisticsCoreService
  ) {}

  async listApprovals(query: unknown, authContext: AuthContext) {
    const approvals = await this.approvalService.list(query);
    return this.resourceAccessService.filterByTenant(authContext, approvals, (approval) => approval.tenantId);
  }

  async approveApproval(id: string, input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    const approval = await this.approvalService.getById(id);
    this.assertApprovalRole(authContext, approval.requiredRoleCode);
    if (approval.tenantId) {
      this.resourceAccessService.ensureTenantAccess(authContext, approval.tenantId);
    }

    if (approval.status !== 'pending') {
      throw new BadRequestException('Only pending approvals can be approved.');
    }

    await this.executeApproval(approval, auditContext);
    const decision = approveSchema.parse(input);
    await this.complianceCoreService.applyApprovalDecision(approval, 'approved', auditContext, decision.comment ?? null);
    const approved = await this.approvalService.markApproved({
      approvalId: id,
      decidedByUserId: auditContext.actorId,
      comment: decision.comment ?? null
    });

    await this.auditService.record({
      module: 'admin-core',
      eventType: 'approval.approved',
      actorId: auditContext.actorId,
      tenantId: approval.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'approval',
      subjectId: approval.id,
      payload: {
        approvalType: approval.approvalType,
        module: approval.module,
        comment: decision.comment ?? null
      }
    });

    return approved;
  }

  async rejectApproval(id: string, input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    const approval = await this.approvalService.getById(id);
    this.assertApprovalRole(authContext, approval.requiredRoleCode);
    if (approval.tenantId) {
      this.resourceAccessService.ensureTenantAccess(authContext, approval.tenantId);
    }

    if (approval.status !== 'pending') {
      throw new BadRequestException('Only pending approvals can be rejected.');
    }

    const decision = rejectSchema.parse(input);
    await this.complianceCoreService.applyApprovalDecision(approval, 'rejected', auditContext, decision.comment ?? null);
    const rejected = await this.approvalService.markRejected({
      approvalId: id,
      decidedByUserId: auditContext.actorId,
      comment: decision.comment ?? null
    });

    await this.auditService.record({
      module: 'admin-core',
      eventType: 'approval.rejected',
      actorId: auditContext.actorId,
      tenantId: approval.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'approval',
      subjectId: approval.id,
      payload: {
        approvalType: approval.approvalType,
        module: approval.module,
        comment: decision.comment ?? null
      }
    });

    return rejected;
  }

  async requestMoreInfo(id: string, input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    const approval = await this.approvalService.getById(id);
    this.assertApprovalRole(authContext, approval.requiredRoleCode);
    if (approval.tenantId) {
      this.resourceAccessService.ensureTenantAccess(authContext, approval.tenantId);
    }

    if (approval.status !== 'pending') {
      throw new BadRequestException('Only pending approvals can be updated.');
    }

    const decision = rejectSchema.parse(input);
    const updated = await this.approvalService.markNeedsMoreInfo({
      approvalId: id,
      decidedByUserId: auditContext.actorId,
      comment: decision.comment ?? null
    });
    await this.complianceCoreService.applyApprovalDecision(approval, 'needs_more_info', auditContext, decision.comment ?? null);

    await this.auditService.record({
      module: 'admin-core',
      eventType: 'approval.needs_more_info',
      actorId: auditContext.actorId,
      tenantId: approval.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'approval',
      subjectId: approval.id,
      payload: {
        approvalType: approval.approvalType,
        module: approval.module,
        comment: decision.comment ?? null
      }
    });

    return updated;
  }

  private async executeApproval(
    approval: Awaited<ReturnType<ApprovalService['getById']>>,
    auditContext: RequestAuditContext
  ) {
    const payload = approval.payload as Record<string, unknown>;
    const approvalAuthContext: AuthContext = {
      isAuthenticated: true,
      subject: auditContext.actorId,
      email: null,
      username: null,
      internalUserId: auditContext.actorId,
      tenantId: approval.tenantId,
      tenantIds: approval.tenantId ? [approval.tenantId] : [],
      roles: ['platform_admin'],
      permissions: [],
      tokenIssuer: null
    };

    if (
      approval.approvalType.startsWith('buyer.') ||
      approval.approvalType.startsWith('supplier.') ||
      approval.approvalType.startsWith('logistics.') ||
      approval.approvalType.startsWith('customs.')
    ) {
      return;
    }

    switch (approval.approvalType) {
      case 'wholesale.quote.accept':
        await this.wholesaleCoreService.acceptQuote(approval.subjectId, payload, auditContext, approvalAuthContext, {
          skipApproval: true
        });
        return;
      case 'contract.status.activate':
        await this.contractCoreService.updateContractStatus(
          approval.subjectId,
          payload,
          auditContext,
          approvalAuthContext,
          {
            skipApproval: true
          }
        );
        return;
      case 'payment.release':
        await this.paymentsEscrowCoreService.releaseFunds(
          approval.subjectId,
          payload,
          auditContext,
          approvalAuthContext,
          {
            skipApproval: true
          }
        );
        return;
      case 'payment.refund':
        await this.paymentsEscrowCoreService.refundFunds(
          approval.subjectId,
          payload,
          auditContext,
          approvalAuthContext,
          {
            skipApproval: true
          }
        );
        return;
      case 'logistics.deal.selection':
        await this.logisticsCoreService.selectProviderForDeal(approval.subjectId, payload, auditContext, approvalAuthContext, {
          skipApproval: true
        });
        return;
      default:
        throw new BadRequestException(`Unsupported approval type ${approval.approvalType}.`);
    }
  }

  private assertApprovalRole(authContext: AuthContext, requiredRoleCode: string | null) {
    if (!requiredRoleCode) {
      return;
    }

    if (!authContext.roles.includes(requiredRoleCode)) {
      throw new ForbiddenException(`Approval requires role ${requiredRoleCode}.`);
    }
  }
}
