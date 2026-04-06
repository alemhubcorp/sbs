import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ApprovalService } from '../../app/approval.service.js';
import { ApprovalPolicyService } from '../../app/approval-policy.service.js';
import type { AuthContext, RequestAuditContext } from '../../app/auth-context.js';
import { ResourceAccessService } from '../../app/resource-access.service.js';
import { AuditService } from '../audit-observability/audit.service.js';
import { PaymentsEscrowCoreRepository } from './payments-escrow-core.repository.js';

const createTransactionSchema = z.object({
  dealId: z.string().min(1),
  currency: z.string().length(3).default('USD'),
  totalAmountMinor: z.coerce.number().int().min(0)
});

const updateEscrowSchema = z.object({
  amountMinor: z.coerce.number().int().min(1).optional(),
  note: z.string().min(1).max(500).optional()
});

@Injectable()
export class PaymentsEscrowCoreService {
  constructor(
    @Inject(PaymentsEscrowCoreRepository) private readonly paymentsEscrowCoreRepository: PaymentsEscrowCoreRepository,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(ApprovalService) private readonly approvalService: ApprovalService,
    @Inject(ApprovalPolicyService) private readonly approvalPolicyService: ApprovalPolicyService,
    @Inject(ResourceAccessService) private readonly resourceAccessService: ResourceAccessService
  ) {}

  async listTransactions(authContext: AuthContext) {
    const transactions = await this.paymentsEscrowCoreRepository.listTransactions();
    return this.resourceAccessService.filterByTenant(authContext, transactions, (transaction) => transaction.deal?.tenantId);
  }

  async getTransactionById(id: string, authContext: AuthContext) {
    await this.resourceAccessService.ensurePaymentAccess(authContext, id);
    return this.paymentsEscrowCoreRepository.getTransactionById(id);
  }

  async createTransaction(input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    const parsed = createTransactionSchema.parse(input);
    await this.resourceAccessService.ensureDealAccess(authContext, parsed.dealId);
    const transaction = await this.paymentsEscrowCoreRepository.createTransaction(parsed);

    await this.auditService.record({
      module: 'payments-escrow-core',
      eventType: 'payment.transaction.created',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'payment-transaction',
      subjectId: transaction.id,
      payload: {
        dealId: transaction.dealId,
        currency: transaction.currency,
        totalAmountMinor: transaction.totalAmountMinor
      }
    });

    return transaction;
  }

  async holdFunds(id: string, input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    await this.resourceAccessService.ensurePaymentAccess(authContext, id);
    const transaction = await this.paymentsEscrowCoreRepository.holdFunds({
      paymentTransactionId: id,
      ...updateEscrowSchema.parse(input)
    });

    await this.recordStateAudit('payment.transaction.held', transaction, auditContext);
    return transaction;
  }

  async releaseFunds(
    id: string,
    input: unknown,
    auditContext: RequestAuditContext,
    authContext: AuthContext,
    options: { skipApproval?: boolean } = {}
  ) {
    await this.resourceAccessService.ensurePaymentAccess(authContext, id);
    const parsed = updateEscrowSchema.parse(input);
    const approvalRule = this.approvalPolicyService.getRule('payment.release');

    if (!options.skipApproval && approvalRule?.enabled) {
      const transaction = await this.paymentsEscrowCoreRepository.getTransactionById(id);
      this.assertReleaseEligible(transaction, parsed.amountMinor);

      const pendingApproval = await this.approvalService.getPendingBySubject(
        'payment-transaction',
        id,
        'payment.release'
      );

      if (pendingApproval) {
        return {
          status: 'pending_approval',
          approval: pendingApproval
        };
      }

      if (!transaction.deal?.tenantId) {
        throw new Error(`Payment transaction ${id} is not linked to a tenant-scoped deal.`);
      }
      const approval = await this.approvalService.create({
        module: 'payments-escrow-core',
        approvalType: 'payment.release',
        tenantId: transaction.deal.tenantId,
        subjectType: 'payment-transaction',
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
        tenantId: transaction.deal.tenantId,
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

    const transaction = await this.paymentsEscrowCoreRepository.releaseFunds({
      paymentTransactionId: id,
      ...parsed
    });

    await this.recordStateAudit('payment.transaction.released', transaction, auditContext);
    return transaction;
  }

  async refundFunds(
    id: string,
    input: unknown,
    auditContext: RequestAuditContext,
    authContext: AuthContext,
    options: { skipApproval?: boolean } = {}
  ) {
    await this.resourceAccessService.ensurePaymentAccess(authContext, id);
    const parsed = updateEscrowSchema.parse(input);
    const approvalRule = this.approvalPolicyService.getRule('payment.refund');

    if (!options.skipApproval && approvalRule?.enabled) {
      const transaction = await this.paymentsEscrowCoreRepository.getTransactionById(id);
      this.assertRefundEligible(transaction, parsed.amountMinor);

      const pendingApproval = await this.approvalService.getPendingBySubject(
        'payment-transaction',
        id,
        'payment.refund'
      );

      if (pendingApproval) {
        return {
          status: 'pending_approval',
          approval: pendingApproval
        };
      }

      if (!transaction.deal?.tenantId) {
        throw new Error(`Payment transaction ${id} is not linked to a tenant-scoped deal.`);
      }
      const approval = await this.approvalService.create({
        module: 'payments-escrow-core',
        approvalType: 'payment.refund',
        tenantId: transaction.deal.tenantId,
        subjectType: 'payment-transaction',
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
        tenantId: transaction.deal.tenantId,
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

    const transaction = await this.paymentsEscrowCoreRepository.refundFunds({
      paymentTransactionId: id,
      ...parsed
    });

    await this.recordStateAudit('payment.transaction.refunded', transaction, auditContext);
    return transaction;
  }

  private recordStateAudit(
    eventType: string,
    transaction: Awaited<ReturnType<PaymentsEscrowCoreRepository['getTransactionById']>>,
    auditContext: RequestAuditContext
  ) {
    return this.auditService.record({
      module: 'payments-escrow-core',
      eventType,
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'payment-transaction',
      subjectId: transaction.id,
      payload: {
        status: transaction.status,
        dealId: transaction.dealId,
        heldAmountMinor: transaction.heldAmountMinor,
        releasedAmountMinor: transaction.releasedAmountMinor,
        refundedAmountMinor: transaction.refundedAmountMinor
      }
    });
  }

  private assertReleaseEligible(
    transaction: Awaited<ReturnType<PaymentsEscrowCoreRepository['getTransactionById']>>,
    requestedAmountMinor?: number
  ) {
    if (!['held', 'partially_released'].includes(transaction.status)) {
      throw new ConflictException(
        `Payment transaction ${transaction.id} cannot enter release approval from ${transaction.status}.`
      );
    }

    const remainingHeldMinor = transaction.heldAmountMinor;
    const releaseAmountMinor = requestedAmountMinor ?? remainingHeldMinor;

    if (releaseAmountMinor <= 0 || releaseAmountMinor > remainingHeldMinor) {
      throw new ConflictException('Release amount must be positive and within held funds.');
    }
  }

  private assertRefundEligible(
    transaction: Awaited<ReturnType<PaymentsEscrowCoreRepository['getTransactionById']>>,
    requestedAmountMinor?: number
  ) {
    if (!['held', 'partially_released', 'released', 'disputed'].includes(transaction.status)) {
      throw new ConflictException(
        `Payment transaction ${transaction.id} cannot enter refund approval from ${transaction.status}.`
      );
    }

    const refundableHeldMinor = transaction.heldAmountMinor;
    const refundAmountMinor = requestedAmountMinor ?? refundableHeldMinor;

    if (refundAmountMinor <= 0 || refundAmountMinor > refundableHeldMinor) {
      throw new ConflictException('Refund amount must be positive and within held funds.');
    }
  }
}
