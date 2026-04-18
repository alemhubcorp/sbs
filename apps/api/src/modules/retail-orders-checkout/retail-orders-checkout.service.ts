import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { RequestAuditContext } from '../../app/auth-context.js';
import type { AuthContext } from '../../app/auth-context.js';
import { AuditService } from '../audit-observability/audit.service.js';
import { NotificationService } from '../notifications-core/notification.service.js';
import { PaymentCoreService } from '../payment-core/payment-core.service.js';
import { RetailOrdersCheckoutRepository } from './retail-orders-checkout.repository.js';
import type { PaymentMethod, PaymentProviderCode } from '../../services/payment/payment.types.js';

const createRetailOrderSchema = z.object({
  buyerProfileId: z.string().min(1).optional(),
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
  status: z.enum(['created', 'pending', 'paid', 'shipped', 'delivered', 'fulfilled', 'cancelled'])
});

const addCartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).default(1)
});

const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(1)
});

const checkoutSchema = z.object({
  name: z.string().min(1).max(120),
  line1: z.string().min(1).max(180),
  line2: z.string().max(180).optional(),
  city: z.string().min(1).max(120),
  region: z.string().min(1).max(120),
  country: z.string().min(2).max(120),
  postalCode: z.string().min(2).max(32),
  phone: z.string().max(40).optional(),
  paymentMethod: z.enum(['card', 'qr', 'bank_transfer', 'manual']).default('card'),
  paymentProvider: z.enum(['internal_manual', 'airwallex', 'none']).optional()
});

const submitPaymentSchema = z.object({
  simulateFailure: z.boolean().optional(),
  note: z.string().max(500).optional()
});

@Injectable()
export class RetailOrdersCheckoutService {
  constructor(
    @Inject(RetailOrdersCheckoutRepository)
    private readonly retailOrdersCheckoutRepository: RetailOrdersCheckoutRepository,
    @Inject(AuditService)
    private readonly auditService: AuditService,
    @Inject(NotificationService)
    private readonly notificationService: NotificationService,
    @Inject(PaymentCoreService)
    private readonly paymentCoreService: PaymentCoreService
  ) {}

  listOrders(authContext: AuthContext) {
    return this.retailOrdersCheckoutRepository.listOrders(authContext);
  }

  getOrderById(id: string, authContext: AuthContext) {
    return this.retailOrdersCheckoutRepository.getOrderById(id, authContext);
  }

  getCart(authContext: AuthContext) {
    return this.retailOrdersCheckoutRepository.getCart(authContext);
  }

  getCurrentOrder(authContext: AuthContext) {
    return this.retailOrdersCheckoutRepository.getCurrentOrder(authContext);
  }

  async createOrder(input: unknown, auditContext: RequestAuditContext, authContext?: AuthContext) {
    const order = await this.retailOrdersCheckoutRepository.createOrder(createRetailOrderSchema.parse(input), authContext);

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
        supplierProfileId: order.supplierProfileId,
        itemCount: order.items.length,
        totalAmountMinor: order.totalAmountMinor,
        currency: order.currency
      }
    });

    await this.emitOrderNotification(order.id, 'retail.order.created', 'Order created', 'Your retail order has been created and is ready for payment.', order, {
      status: order.status,
      paymentStatus: order.paymentStatus
    });

    return order;
  }

  async addItemToCart(input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    const parsed = addCartItemSchema.parse(input);
    const order = await this.retailOrdersCheckoutRepository.addItemToCart(authContext, parsed);

    await this.recordOrderEvent('retail.cart.item.added', order.id, auditContext, {
      productId: parsed.productId,
      quantity: parsed.quantity,
      totalAmountMinor: order.totalAmountMinor,
      currency: order.currency
    });

    return order;
  }

  async updateCartItem(itemId: string, input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    const parsed = updateCartItemSchema.parse(input);
    const order = await this.retailOrdersCheckoutRepository.updateCartItemQuantity(authContext, itemId, parsed);

    await this.recordOrderEvent('retail.cart.item.updated', order.id, auditContext, {
      itemId,
      quantity: parsed.quantity,
      totalAmountMinor: order.totalAmountMinor,
      currency: order.currency
    });

    return order;
  }

  async removeCartItem(itemId: string, auditContext: RequestAuditContext, authContext: AuthContext) {
    const order = await this.retailOrdersCheckoutRepository.removeCartItem(authContext, itemId);

    await this.recordOrderEvent('retail.cart.item.removed', order.id, auditContext, {
      itemId,
      totalAmountMinor: order.totalAmountMinor,
      currency: order.currency
    });

    return order;
  }

  async checkoutOrder(id: string, input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    const parsed = checkoutSchema.parse(input);
    const order = await this.retailOrdersCheckoutRepository.checkoutOrder(authContext, id, parsed);

    await this.paymentCoreService.selectOrderPayment(
      {
        id: order.id,
        status: order.status,
        currency: order.currency,
        totalAmountMinor: order.totalAmountMinor,
        paymentStatus: order.paymentStatus,
        paymentTransactionId: order.paymentTransactionId,
        buyerProfile: order.buyerProfile
          ? {
              displayName: order.buyerProfile.displayName,
              user: order.buyerProfile.user ? { email: order.buyerProfile.user.email } : null,
              tenantId: order.buyerProfile.tenant?.id ?? null
            }
          : null,
        supplierProfile: order.supplierProfile
          ? {
              displayName: order.supplierProfile.displayName,
              user: order.supplierProfile.user ? { email: order.supplierProfile.user.email } : null,
              tenantId: order.supplierProfile.tenant?.id ?? null
            }
          : null
      },
      {
        method: parsed.paymentMethod as PaymentMethod,
        provider: parsed.paymentProvider as PaymentProviderCode | undefined
      },
      auditContext
    );

    const refreshed = await this.retailOrdersCheckoutRepository.getOrderById(order.id, authContext);

    await this.recordOrderEvent('retail.order.checked_out', refreshed.id, auditContext, {
      shippingAddress: refreshed.shippingAddress,
      totalAmountMinor: refreshed.totalAmountMinor,
      currency: refreshed.currency,
      paymentMethod: parsed.paymentMethod,
      paymentProvider: parsed.paymentProvider ?? 'internal_manual'
    });

    await this.emitOrderNotification(
      refreshed.id,
      'retail.order.checked_out',
      'Checkout completed',
      `Payment method ${parsed.paymentMethod} is selected. ${refreshed.paymentStatus === 'pending' ? 'Pending payment review is required.' : 'Payment instructions are ready.'}`,
      refreshed,
      {
        paymentMethod: parsed.paymentMethod,
        paymentProvider: parsed.paymentProvider ?? 'internal_manual',
        paymentStatus: refreshed.paymentStatus
      }
    );

    return refreshed;
  }

  async submitPayment(id: string, input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    const parsed = submitPaymentSchema.parse(input);
    const order = await this.retailOrdersCheckoutRepository.getOrderById(id, authContext);
    await this.paymentCoreService.confirmOrderPayment(
      {
        id: order.id,
        status: order.status,
        currency: order.currency,
        totalAmountMinor: order.totalAmountMinor,
        paymentStatus: order.paymentStatus,
        paymentTransactionId: order.paymentTransactionId,
        buyerProfile: order.buyerProfile
          ? {
              displayName: order.buyerProfile.displayName,
              user: order.buyerProfile.user ? { email: order.buyerProfile.user.email } : null,
              tenantId: order.buyerProfile.tenant?.id ?? null
            }
          : null,
        supplierProfile: order.supplierProfile
          ? {
              displayName: order.supplierProfile.displayName,
              user: order.supplierProfile.user ? { email: order.supplierProfile.user.email } : null,
              tenantId: order.supplierProfile.tenant?.id ?? null
            }
          : null
      },
      {
        method: 'manual',
        simulateFailure: parsed.simulateFailure,
        note: parsed.note
      },
      auditContext
    );

    const updated = await this.retailOrdersCheckoutRepository.getOrderById(id, authContext);

    await this.recordOrderEvent(
      updated.paymentStatus === 'failed' ? 'retail.order.payment.failed' : 'retail.order.payment.submitted',
      updated.id,
      auditContext,
      {
        paymentStatus: updated.paymentStatus,
        paymentTransactionId: updated.paymentTransactionId,
        totalAmountMinor: updated.totalAmountMinor,
        currency: updated.currency,
        note: parsed.note ?? null
      }
    );

    await this.emitOrderNotification(
      updated.id,
      updated.paymentStatus === 'failed' ? 'retail.order.payment.failed' : 'retail.order.payment.submitted',
      updated.paymentStatus === 'failed' ? 'Payment failed' : 'Payment submitted',
      updated.paymentStatus === 'failed'
        ? 'The payment attempt failed. Please retry or choose another method.'
        : 'The payment has been recorded and is awaiting confirmation.',
      updated,
      {
        paymentStatus: updated.paymentStatus,
        paymentTransactionId: updated.paymentTransactionId,
        note: parsed.note ?? null
      }
    );

    return updated;
  }

  async shipOrder(id: string, auditContext: RequestAuditContext, authContext: AuthContext) {
    const order = await this.retailOrdersCheckoutRepository.shipOrder(authContext, id);

    await this.recordOrderEvent('retail.order.shipped', order.id, auditContext, {
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentTransactionId: order.paymentTransactionId
    });

    await this.emitOrderNotification(
      order.id,
      'retail.order.shipped',
      'Order shipped',
      'The supplier marked the order as shipped.',
      order,
      {
        status: order.status,
        paymentStatus: order.paymentStatus
      }
    );

    return order;
  }

  async confirmDelivery(id: string, auditContext: RequestAuditContext, authContext: AuthContext) {
    const order = await this.retailOrdersCheckoutRepository.confirmDelivery(authContext, id);

    await this.recordOrderEvent('retail.order.delivered', order.id, auditContext, {
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentTransactionId: order.paymentTransactionId
    });

    await this.emitOrderNotification(
      order.id,
      'retail.order.delivered',
      'Order delivered',
      'Delivery was confirmed and the order is now completed.',
      order,
      {
        status: order.status,
        paymentStatus: order.paymentStatus
      }
    );

    return order;
  }

  async updateOrderStatus(id: string, input: unknown, auditContext: RequestAuditContext, authContext?: AuthContext) {
    const order = await this.retailOrdersCheckoutRepository.updateOrderStatus(
      id,
      updateRetailOrderStatusSchema.parse(input),
      authContext
    );

    await this.recordOrderEvent('retail.order.status.updated', order.id, auditContext, {
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentTransactionId: order.paymentTransactionId
    });

    return order;
  }

  getHistory(id: string, authContext: AuthContext) {
    return this.retailOrdersCheckoutRepository.getHistory(id, authContext);
  }

  private recordOrderEvent(
    eventType: string,
    orderId: string,
    auditContext: RequestAuditContext,
    payload: Record<string, unknown>
  ) {
    return this.auditService.record({
      module: 'retail-orders-checkout',
      eventType,
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'retail-order',
      subjectId: orderId,
      payload
    });
  }

  private async emitOrderNotification(
    orderId: string,
    type: string,
    title: string,
    message: string,
    order: Awaited<ReturnType<RetailOrdersCheckoutRepository['getOrderById']>>,
    metadata: Record<string, unknown>
  ) {
    const recipients = [order.buyerProfile?.user?.id, order.supplierProfile?.user?.id].filter(
      (value): value is string => Boolean(value)
    );

    if (!recipients.length) {
      return;
    }

    await this.notificationService.emitMany(recipients, {
      type,
      title,
      message,
      entityType: 'retail-order',
      entityId: orderId,
      metadata: metadata as import('@prisma/client').Prisma.InputJsonValue
    });
  }
}
