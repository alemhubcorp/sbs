import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { ApprovalService } from '../../app/approval.service.js';
import { ApprovalPolicyService } from '../../app/approval-policy.service.js';
import type { AuthContext, RequestAuditContext } from '../../app/auth-context.js';
import { ResourceAccessService } from '../../app/resource-access.service.js';
import { AuditService } from '../audit-observability/audit.service.js';
import { WholesaleCoreRepository } from './wholesale-core.repository.js';

const createWholesaleRfqSchema = z.object({
  tenantId: z.string().min(1),
  buyerProfileId: z.string().min(1).optional(),
  requestedByUserId: z.string().min(1).optional(),
  title: z.string().min(1).max(160),
  description: z.string().min(1).max(2000).optional(),
  currency: z.string().length(3).default('USD')
});

const createWholesaleQuoteSchema = z.object({
  sellerProfileId: z.string().min(1),
  amountMinor: z.coerce.number().int().min(0),
  currency: z.string().length(3),
  message: z.string().min(1).max(2000).optional()
});

const acceptWholesaleQuoteSchema = z.object({
  contractId: z.string().min(1).optional(),
  documentLinkage: z.custom<Prisma.InputJsonValue | undefined>(
    (value) => value === undefined || value === null || typeof value === 'object' || Array.isArray(value),
    {
      message: 'documentLinkage must be a JSON object or array.'
    }
  ).optional()
});

@Injectable()
export class WholesaleCoreService {
  constructor(
    @Inject(WholesaleCoreRepository) private readonly wholesaleCoreRepository: WholesaleCoreRepository,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(ApprovalService) private readonly approvalService: ApprovalService,
    @Inject(ApprovalPolicyService) private readonly approvalPolicyService: ApprovalPolicyService,
    @Inject(ResourceAccessService) private readonly resourceAccessService: ResourceAccessService
  ) {}

  async listRfqs(authContext: AuthContext) {
    const rfqs = await this.wholesaleCoreRepository.listRfqs();
    return this.resourceAccessService.filterByTenant(authContext, rfqs, (rfq) => rfq.tenantId);
  }

  async createRfq(input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    const parsed = createWholesaleRfqSchema.parse(input);
    this.resourceAccessService.ensureTenantAccess(authContext, parsed.tenantId);
    const rfq = await this.wholesaleCoreRepository.createRfq(parsed);

    await this.auditService.record({
      module: 'wholesale-core',
      eventType: 'wholesale.rfq.created',
      actorId: auditContext.actorId,
      tenantId: rfq.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'wholesale-rfq',
      subjectId: rfq.id,
      payload: {
        title: rfq.title,
        currency: rfq.currency,
        buyerProfileId: rfq.buyerProfileId,
        requestedByUserId: rfq.requestedByUserId
      }
    });

    return rfq;
  }

  async listQuotesForRfq(rfqId: string, authContext: AuthContext) {
    await this.resourceAccessService.ensureRfqAccess(authContext, rfqId);
    return this.wholesaleCoreRepository.listQuotesForRfq(rfqId);
  }

  async submitQuote(rfqId: string, input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    await this.resourceAccessService.ensureRfqAccess(authContext, rfqId);
    const quote = await this.wholesaleCoreRepository.submitQuote({
      rfqId,
      ...createWholesaleQuoteSchema.parse(input)
    });

    await this.auditService.record({
      module: 'wholesale-core',
      eventType: 'wholesale.quote.submitted',
      actorId: auditContext.actorId,
      tenantId: quote.rfq.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'wholesale-quote',
      subjectId: quote.id,
      payload: {
        rfqId: quote.rfqId,
        sellerProfileId: quote.sellerProfileId,
        amountMinor: quote.amountMinor,
        currency: quote.currency
      }
    });

    return quote;
  }

  async listDeals(authContext: AuthContext) {
    const deals = await this.wholesaleCoreRepository.listDeals();
    return this.resourceAccessService.filterByTenant(authContext, deals, (deal) => deal.tenantId);
  }

  async getDealById(id: string, authContext: AuthContext) {
    await this.resourceAccessService.ensureDealAccess(authContext, id);
    return this.wholesaleCoreRepository.getDealById(id);
  }

  async getDealRoomByDealId(dealId: string, authContext: AuthContext) {
    await this.resourceAccessService.ensureDealAccess(authContext, dealId);
    return this.wholesaleCoreRepository.getDealRoomByDealId(dealId);
  }

  async acceptQuote(
    quoteId: string,
    input: unknown,
    auditContext: RequestAuditContext,
    authContext: AuthContext,
    options: { skipApproval?: boolean } = {}
  ) {
    const parsed = acceptWholesaleQuoteSchema.parse(input);
    const quote = await this.wholesaleCoreRepository.getQuoteById(quoteId);
    this.resourceAccessService.ensureTenantAccess(authContext, quote.rfq.tenantId);
    const approvalRule = this.approvalPolicyService.getRule('wholesale.quote.accept');

    if (!options.skipApproval && approvalRule?.enabled) {
      const pendingApproval = await this.approvalService.getPendingBySubject(
        'wholesale-quote',
        quoteId,
        'wholesale.quote.accept'
      );

      if (pendingApproval) {
        return {
          status: 'pending_approval',
          approval: pendingApproval
        };
      }

      const approval = await this.approvalService.create({
        module: 'wholesale-core',
        approvalType: 'wholesale.quote.accept',
        tenantId: quote.rfq.tenantId,
        subjectType: 'wholesale-quote',
        subjectId: quoteId,
        requestedByUserId: auditContext.actorId,
        requiredRoleCode: approvalRule.requiredRoleCode,
        reason: approvalRule.reason,
        payload: parsed
      });

      await this.auditService.record({
        module: 'admin-core',
        eventType: 'approval.requested',
        actorId: auditContext.actorId,
        tenantId: quote.rfq.tenantId,
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

    const deal = await this.wholesaleCoreRepository.acceptQuote({
      quoteId,
      ...parsed
    });

    await this.auditService.record({
      module: 'wholesale-core',
      eventType: 'wholesale.deal.created',
      actorId: auditContext.actorId,
      tenantId: deal.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'wholesale-deal',
      subjectId: deal.id,
      payload: {
        rfqId: deal.rfqId,
        acceptedQuoteId: deal.acceptedQuoteId,
        sellerProfileId: deal.sellerProfileId,
        contractId: deal.contractId,
        dealRoomId: deal.dealRoom?.id ?? null
      }
    });

    return deal;
  }
}
