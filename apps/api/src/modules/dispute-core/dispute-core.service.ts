import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { RequestAuditContext } from '../../app/auth-context.js';
import { AuditService } from '../audit-observability/audit.service.js';
import { DisputeCoreRepository } from './dispute-core.repository.js';

const createDisputeSchema = z.object({
  dealId: z.string().min(1).optional(),
  paymentTransactionId: z.string().min(1).optional(),
  disputeType: z.enum(['payment', 'document', 'commercial']),
  reason: z.string().min(1).max(2000)
});

const updateDisputeStatusSchema = z.object({
  status: z.enum(['open', 'under_review', 'resolved', 'rejected'])
});

@Injectable()
export class DisputeCoreService {
  constructor(
    @Inject(DisputeCoreRepository) private readonly disputeCoreRepository: DisputeCoreRepository,
    @Inject(AuditService) private readonly auditService: AuditService
  ) {}

  listDisputes() {
    return this.disputeCoreRepository.listDisputes();
  }

  getDisputeById(id: string) {
    return this.disputeCoreRepository.getDisputeById(id);
  }

  async createDispute(input: unknown, auditContext: RequestAuditContext) {
    const dispute = await this.disputeCoreRepository.createDispute(createDisputeSchema.parse(input));

    await this.auditService.record({
      module: 'dispute-core',
      eventType: 'dispute.created',
      actorId: auditContext.actorId,
      tenantId: dispute.deal?.tenantId ?? auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'dispute',
      subjectId: dispute.id,
      payload: {
        dealId: dispute.dealId,
        paymentTransactionId: dispute.paymentTransactionId,
        disputeType: dispute.disputeType,
        status: dispute.status
      }
    });

    return dispute;
  }

  async updateDisputeStatus(id: string, input: unknown, auditContext: RequestAuditContext) {
    const dispute = await this.disputeCoreRepository.updateDisputeStatus(
      id,
      updateDisputeStatusSchema.parse(input).status
    );

    await this.auditService.record({
      module: 'dispute-core',
      eventType: 'dispute.status.updated',
      actorId: auditContext.actorId,
      tenantId: dispute.deal?.tenantId ?? auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'dispute',
      subjectId: dispute.id,
      payload: {
        status: dispute.status
      }
    });

    return dispute;
  }
}
