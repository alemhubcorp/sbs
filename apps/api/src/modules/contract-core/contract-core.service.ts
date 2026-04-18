import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { ApprovalService } from '../../app/approval.service.js';
import { ApprovalPolicyService } from '../../app/approval-policy.service.js';
import type { AuthContext, RequestAuditContext } from '../../app/auth-context.js';
import { ResourceAccessService } from '../../app/resource-access.service.js';
import { AuditService } from '../audit-observability/audit.service.js';
import { NotificationService } from '../notifications-core/notification.service.js';
import { PaymentCoreService } from '../payment-core/payment-core.service.js';
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

const createContractRfqSchema = z.object({
  productId: z.string().trim().min(1).catch('unknown'),
  qty: z.coerce.number().int().positive().catch(1)
});

const updateContractRfqStatusSchema = z.object({
  status: z.enum(['new', 'quoted', 'accepted', 'rejected'])
});

const createContractRfqQuoteSchema = z.object({
  rfqId: z.string().uuid(),
  unitPrice: z.coerce.number().int().positive(),
  totalPrice: z.coerce.number().int().positive(),
  currency: z.string().trim().min(3).max(12),
  note: z.string().trim().max(500).optional()
});

const updateContractRfqQuoteStatusSchema = z.object({
  status: z.enum(['submitted', 'accepted', 'rejected'])
});

const updateContractRfqDealActionSchema = z.enum(['fund', 'ship', 'confirm', 'dispute']);
const dealPaymentMethodSchema = z.object({
  method: z.enum(['swift', 'iban_invoice', 'manual', 'bank_transfer']),
  provider: z.enum(['internal_manual', 'airwallex', 'none']).optional(),
  note: z.string().max(500).optional()
});

@Injectable()
export class ContractCoreService {
  constructor(
    @Inject(ContractCoreRepository) private readonly contractCoreRepository: ContractCoreRepository,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(NotificationService) private readonly notificationService: NotificationService,
    @Inject(ApprovalService) private readonly approvalService: ApprovalService,
    @Inject(ApprovalPolicyService) private readonly approvalPolicyService: ApprovalPolicyService,
    @Inject(ResourceAccessService) private readonly resourceAccessService: ResourceAccessService,
    @Inject(PaymentCoreService) private readonly paymentCoreService: PaymentCoreService
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

  createContractRfq(input: unknown, authContext?: AuthContext) {
    const actor = this.requireMarketplaceUser(authContext);
    this.ensureBuyerRole(authContext);
    return this.contractCoreRepository.createContractRfq({
      ...createContractRfqSchema.parse(input),
      buyerUserId: actor
    });
  }

  listContractRfqs(authContext?: AuthContext) {
    const actor = this.requireMarketplaceUser(authContext);
    return this.contractCoreRepository.listContractRfqsForUser(actor);
  }

  updateContractRfqStatus(id: string, input: unknown, authContext?: AuthContext) {
    const actor = this.requireMarketplaceUser(authContext);
    this.ensureBuyerRole(authContext);
    const parsed = updateContractRfqStatusSchema.parse(input);
    return this.contractCoreRepository.getContractRfqByIdForUser(id, actor).then((rfq) => {
      if (rfq.buyerUserId !== actor) {
        throw new ForbiddenException('Only the buyer can update RFQ status.');
      }

      return this.contractCoreRepository.updateContractRfqStatus({
        id,
        status: parsed.status
      });
    });
  }

  async createContractRfqQuote(input: unknown, authContext?: AuthContext) {
    const actor = this.requireMarketplaceUser(authContext);
    this.ensureSupplierRole(authContext);
    const parsed = createContractRfqQuoteSchema.parse(input);
    const rfq = await this.contractCoreRepository.getContractRfqByIdForUser(parsed.rfqId, actor);

    if (rfq.supplierUserId !== actor) {
      throw new ForbiddenException('Only the linked supplier can send a quote for this RFQ.');
    }

    return this.contractCoreRepository.createContractRfqQuote({
      ...parsed,
      supplierUserId: actor
    });
  }

  listContractRfqQuotes(authContext?: AuthContext) {
    const actor = this.requireMarketplaceUser(authContext);
    return this.contractCoreRepository.listContractRfqQuotesForUser(actor);
  }

  async acceptContractRfqQuote(id: string, authContext?: AuthContext) {
    const actor = this.requireMarketplaceUser(authContext);
    this.ensureBuyerRole(authContext);
    const quote = await this.contractCoreRepository.getContractRfqQuoteByIdForUser(id, actor);

    if (quote.buyerUserId !== actor) {
      throw new ForbiddenException('Only the buyer can accept this quote.');
    }

    const deal = await this.contractCoreRepository.createContractRfqDealForAcceptedQuote(id);

    await this.emitDealNotification(
      deal,
      'contract.deal.created',
      'Deal created',
      'The RFQ was accepted and a new deal has been created.'
    );

    return deal;
  }

  async rejectContractRfqQuote(id: string, authContext?: AuthContext) {
    const actor = this.requireMarketplaceUser(authContext);
    this.ensureBuyerRole(authContext);
    const quote = await this.contractCoreRepository.getContractRfqQuoteByIdForUser(id, actor);

    if (quote.buyerUserId !== actor) {
      throw new ForbiddenException('Only the buyer can reject this quote.');
    }

    return this.contractCoreRepository.rejectContractRfqQuote(id);
  }

  async updateContractRfqQuoteStatus(id: string, input: unknown, authContext?: AuthContext) {
    const actor = this.requireMarketplaceUser(authContext);
    const parsed = updateContractRfqQuoteStatusSchema.parse(input);
    const quote = await this.contractCoreRepository.getContractRfqQuoteByIdForUser(id, actor);

    if (parsed.status === 'submitted') {
      this.ensureSupplierRole(authContext);

      if (quote.supplierUserId !== actor) {
        throw new ForbiddenException('Only the supplier can submit this quote.');
      }
    } else {
      this.ensureBuyerRole(authContext);

      if (quote.buyerUserId !== actor) {
        throw new ForbiddenException('Only the buyer can change quote decision status.');
      }
    }

    return this.contractCoreRepository.updateContractRfqQuoteStatus({
      id,
      status: parsed.status
    });
  }

  listContractRfqDeals(authContext?: AuthContext) {
    const actor = this.requireMarketplaceUser(authContext);
    return this.contractCoreRepository.listContractRfqDealsForUser(actor);
  }

  async progressContractRfqDeal(id: string, action: unknown, authContext?: AuthContext) {
    const actor = this.requireMarketplaceUser(authContext);
    const parsed = updateContractRfqDealActionSchema.parse(action);
    const deal = await this.contractCoreRepository.getContractRfqDealByIdForUser(id, actor);

    if (parsed === 'fund' || parsed === 'confirm') {
      this.ensureBuyerRole(authContext);

      if (deal.buyerUserId !== actor) {
        throw new ForbiddenException('Only the buyer can perform this deal action.');
      }
    } else if (parsed === 'ship') {
      this.ensureSupplierRole(authContext);

      if (deal.supplierUserId !== actor) {
        throw new ForbiddenException('Only the supplier can perform this deal action.');
      }
    } else if (deal.buyerUserId !== actor && deal.supplierUserId !== actor) {
      throw new ForbiddenException('Only deal participants can open a dispute.');
    }

    if (parsed === 'fund') {
      const payment = await this.paymentCoreService.confirmDealPayment(
        {
          id: deal.id,
          dealStatus: deal.dealStatus,
          buyerStatus: deal.buyerStatus,
          supplierStatus: deal.supplierStatus,
          buyerUserId: deal.buyerUserId,
          supplierUserId: deal.supplierUserId,
          tenantId: authContext?.tenantId ?? null,
          quote: {
            currency: deal.quote?.currency,
            totalPrice: deal.quote?.totalPrice
          }
        },
        {
          method: 'manual'
        },
        {
          actorId: authContext?.internalUserId ?? null,
          tenantId: authContext?.tenantId ?? null,
          correlationId: `deal-fund-${id}`,
          roles: authContext?.roles ?? []
        } as RequestAuditContext
      );

      await this.auditService.record({
        module: 'contract-core',
        eventType: 'contract.deal.fund_requested',
        actorId: authContext?.internalUserId ?? null,
        tenantId: authContext?.tenantId ?? null,
        correlationId: `deal-fund-${id}`,
        subjectType: 'deal',
        subjectId: id,
        payload: {
          paymentRecordId: payment.id,
          paymentStatus: payment.status,
          paymentMethod: payment.method,
          paymentProvider: payment.provider
        }
      });

      await this.emitDealNotification(
        deal,
        'contract.deal.fund_requested',
        'Funding request submitted',
        'Payment instructions were submitted. The deal will move to escrow once payment is confirmed.'
      );

      return this.contractCoreRepository.getContractRfqDealByIdForUser(id, actor);
    }

    const updated = await this.contractCoreRepository.progressContractRfqDeal(id, parsed);

    await this.emitDealNotification(
      updated,
      `contract.deal.${parsed}`,
      parsed === 'ship' ? 'Deal shipped' : parsed === 'confirm' ? 'Delivery confirmed' : 'Deal disputed',
      parsed === 'ship'
        ? 'The supplier marked the deal as shipped.'
        : parsed === 'confirm'
          ? 'The buyer confirmed delivery.'
          : 'The deal has been moved to dispute review.'
    );

    return updated;
  }

  async selectDealPaymentMethod(id: string, input: unknown, auditContext: RequestAuditContext, authContext?: AuthContext) {
    const actor = this.requireMarketplaceUser(authContext);
    this.ensureBuyerRole(authContext);
    const deal = await this.contractCoreRepository.getContractRfqDealByIdForUser(id, actor);

    if (deal.buyerUserId !== actor) {
      throw new ForbiddenException('Only the buyer can select payment instructions.');
    }

    const parsed = dealPaymentMethodSchema.parse(input);

    return this.paymentCoreService.selectDealPayment(
      {
        id: deal.id,
        dealStatus: deal.dealStatus,
        buyerStatus: deal.buyerStatus,
        supplierStatus: deal.supplierStatus,
        buyerUserId: deal.buyerUserId,
        supplierUserId: deal.supplierUserId,
        tenantId: authContext?.tenantId ?? null,
        quote: {
          currency: deal.quote?.currency,
          totalPrice: deal.quote?.totalPrice
        }
      },
      parsed,
      auditContext
    );
  }

  async getDealPayment(id: string, authContext?: AuthContext) {
    const actor = this.requireMarketplaceUser(authContext);
    const deal = await this.contractCoreRepository.getContractRfqDealByIdForUser(id, actor);
    return this.paymentCoreService.getDealPayment(deal.id);
  }

  async getDealById(id: string, authContext?: AuthContext) {
    const actor = this.requireMarketplaceUser(authContext);
    return this.contractCoreRepository.getContractRfqDealByIdForUser(id, actor);
  }

  private requireMarketplaceUser(authContext?: AuthContext) {
    if (!authContext?.isAuthenticated || !authContext.internalUserId) {
      throw new ForbiddenException('Authenticated marketplace user required.');
    }

    return authContext.internalUserId;
  }

  private ensureBuyerRole(authContext?: AuthContext) {
    if (!authContext?.roles.includes('customer_user')) {
      throw new ForbiddenException('Buyer role required.');
    }
  }

  private ensureSupplierRole(authContext?: AuthContext) {
    if (!authContext || !(authContext.roles.includes('platform_admin') || authContext.roles.includes('supplier_user'))) {
      throw new ForbiddenException('Supplier role required.');
    }
  }

  private async emitDealNotification(
    deal: Awaited<ReturnType<ContractCoreRepository['getContractRfqDealByIdForUser']>>,
    type: string,
    title: string,
    message: string
  ) {
    const recipients = [deal.buyerUserId, deal.supplierUserId].filter((value): value is string => Boolean(value));

    if (!recipients.length) {
      return;
    }

    await this.notificationService.emitMany(recipients, {
      type,
      title,
      message,
      entityType: 'contract-rfq-deal',
      entityId: deal.id,
      metadata: {
        dealStatus: deal.dealStatus,
        buyerStatus: deal.buyerStatus,
        supplierStatus: deal.supplierStatus,
        rfqId: deal.rfqId,
        quoteId: deal.quoteId
      }
    });
  }
}
