import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { RequestAuditContext } from '../../app/auth-context.js';
import { AuditService } from '../audit-observability/audit.service.js';
import { RetailOrdersCheckoutRepository } from './retail-orders-checkout.repository.js';

const createRetailOrderSchema = z.object({
  buyerProfileId: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().min(1)
      })
    )
    .min(1)
});

const updateRetailOrderStatusSchema = z.object({
  status: z.enum(['paid', 'fulfilled', 'cancelled'])
});

@Injectable()
export class RetailOrdersCheckoutService {
  constructor(
    @Inject(RetailOrdersCheckoutRepository)
    private readonly retailOrdersCheckoutRepository: RetailOrdersCheckoutRepository,
    @Inject(AuditService)
    private readonly auditService: AuditService
  ) {}

  listOrders() {
    return this.retailOrdersCheckoutRepository.listOrders();
  }

  getOrderById(id: string) {
    return this.retailOrdersCheckoutRepository.getOrderById(id);
  }

  async createOrder(input: unknown, auditContext: RequestAuditContext) {
    const order = await this.retailOrdersCheckoutRepository.createOrder(createRetailOrderSchema.parse(input));

    await this.auditService.record({
      module: 'retail-orders-checkout',
      eventType: 'retail.order.created',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'retail-order',
      subjectId: order.id,
      payload: {
        buyerProfileId: order.buyerProfileId,
        itemCount: order.items.length,
        totalAmountMinor: order.totalAmountMinor,
        currency: order.currency
      }
    });

    return order;
  }

  async updateOrderStatus(id: string, input: unknown, auditContext: RequestAuditContext) {
    const order = await this.retailOrdersCheckoutRepository.updateOrderStatus(
      id,
      updateRetailOrderStatusSchema.parse(input)
    );

    await this.auditService.record({
      module: 'retail-orders-checkout',
      eventType: 'retail.order.status.updated',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'retail-order',
      subjectId: order.id,
      payload: {
        status: order.status
      }
    });

    return order;
  }
}
