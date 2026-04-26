import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { RequestAuditContext } from '../../app/auth-context.js';
import { PrismaService } from '../../app/prisma.service.js';
import { AuditService } from '../audit-observability/audit.service.js';
import { AdminOpsRepository } from '../admin-ops/admin-ops.repository.js';
import {
  adminSettingKeys,
  defaultAdminSettings,
  getBoolean,
  getSettingValue,
  getString,
  isPlainObject,
  type AdminSettingRow
} from '../admin-ops/admin-ops.defaults.js';
import { PaymentCoreRepository } from './payment-core.repository.js';
import { AirwallexPaymentProvider } from '../../services/payment/providers/airwallex/airwallex.provider.js';
import { InternalManualPaymentProvider } from '../../services/payment/providers/internal-manual.provider.js';
import type {
  PaymentMethod,
  PaymentProviderCode,
  PaymentRecordStatus
} from '../../services/payment/payment.types.js';

type OrderSubject = {
  id: string;
  status: string;
  currency: string;
  totalAmountMinor: number;
  paymentStatus: string;
  paymentTransactionId: string | null;
  buyerProfile: { displayName?: string | null; user?: { email?: string | null } | null; tenantId?: string | null } | null;
  supplierProfile: { displayName?: string | null; user?: { email?: string | null } | null; tenantId?: string | null } | null;
};

type DealSubject = {
  id: string;
  dealStatus: string;
  buyerStatus: string;
  supplierStatus: string;
  buyerUserId: string | null;
  supplierUserId: string | null;
  tenantId?: string | null;
  rfq?: { currency?: string | null } | null;
  quote?: { currency?: string | null; totalPrice?: number | null } | null;
};

type PaymentSelectionInput = {
  method: PaymentMethod;
  provider?: PaymentProviderCode | undefined;
  note?: string | undefined;
  simulateFailure?: boolean | undefined;
  metadata?: Prisma.InputJsonValue | undefined;
};

type ProviderConnection = {
  providerName: string;
  providerType: string;
  enabled: boolean;
  mode: string;
  publicKey: string;
  secretKey: string;
  webhookSecret: string;
  merchantId: string;
  terminalId: string;
  accountId: string;
  clientId: string;
  clientSecret: string;
  apiBaseUrl: string;
  callbackUrl: string;
  returnUrl: string;
  statusEndpoint: string;
  notes: string;
};

type PaymentConfigSnapshot = {
  paymentProviders: {
    airwallex: ProviderConnection;
    internal_manual: ProviderConnection;
    bank_transfer: ProviderConnection;
  };
  bankReceiving: {
    beneficiaryName: string;
    bankName: string;
  };
  platformReceiving: {
    platformLegalName: string;
  };
  paymentRouting: Record<PaymentMethod, string>;
};

@Injectable()
export class PaymentCoreService {
  private readonly internalManualProvider = new InternalManualPaymentProvider();
  private readonly airwallexProvider = new AirwallexPaymentProvider();

  constructor(
    @Inject(PaymentCoreRepository) private readonly paymentCoreRepository: PaymentCoreRepository,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(AdminOpsRepository) private readonly adminOpsRepository: AdminOpsRepository
  ) {}

  listPayments() {
    return this.paymentCoreRepository.listPayments();
  }

  getPaymentById(id: string) {
    return this.paymentCoreRepository.getPaymentById(id);
  }

  getOrderPayment(orderId: string) {
    return this.paymentCoreRepository.getPaymentByOrderId(orderId);
  }

  getDealPayment(dealId: string) {
    return this.paymentCoreRepository.getPaymentByDealId(dealId);
  }

  getPaymentHistory(paymentRecordId: string) {
    return this.paymentCoreRepository.getPaymentHistory(paymentRecordId);
  }

  async selectOrderPayment(order: OrderSubject, input: PaymentSelectionInput, auditContext: RequestAuditContext) {
    const config = await this.loadPaymentConfig();
    const providerSelection = this.resolveProvider(input.provider, input.method, config);
    const instructions = this.buildInstructions({
      scope: 'order',
      method: input.method,
      amountMinor: order.totalAmountMinor,
      currency: order.currency,
      merchantName: config.platformReceiving.platformLegalName,
      beneficiaryName:
        config.bankReceiving.beneficiaryName ||
        order.supplierProfile?.displayName ||
        order.supplierProfile?.user?.email ||
        'Supplier',
      bankName: config.bankReceiving.bankName || 'Airwallex Global'
    }, providerSelection.provider);

    const paymentRecord = await this.paymentCoreRepository.upsertPaymentRecord({
      scope: 'order',
      orderId: order.id,
      amountMinor: order.totalAmountMinor,
      currency: order.currency,
      method: input.method,
      provider: providerSelection.provider,
      status: instructions.status === 'invoice_issued' ? 'pending' : instructions.status,
      externalId: instructions.externalId,
      transactionId: instructions.transactionId,
      bankReference: instructions.bankReference,
      paymentReference: instructions.paymentReference,
      instructions: instructions.instructions,
      metadata: {
        note: input.note ?? null,
        providerSelection: {
          requestedProvider: input.provider ?? null,
          resolvedProvider: providerSelection.provider,
          fallbackReason: providerSelection.fallbackReason,
          providerReady: providerSelection.ready
        }
      }
    });

    await this.paymentCoreRepository.createAttempt({
      paymentRecordId: paymentRecord.id,
      attemptType: 'initiate',
      method: input.method,
      provider: providerSelection.provider,
      status: paymentRecord.status,
      amountMinor: order.totalAmountMinor,
      currency: order.currency,
      externalId: paymentRecord.externalId,
      transactionId: paymentRecord.transactionId,
      bankReference: paymentRecord.bankReference,
      paymentReference: paymentRecord.paymentReference,
      note: input.note ?? null,
      payload: paymentRecord.instructions ?? undefined
    });

    await this.prismaUpdateOrder(order.id, {
      paymentStatus: this.mapRecordStatusToRetailStatus(paymentRecord.status),
      paymentTransactionId: paymentRecord.transactionId
    });

    await this.auditService.record({
      module: 'payment-core',
      eventType: 'payment.order.method.selected',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'payment-record',
      subjectId: paymentRecord.id,
      payload: {
        orderId: order.id,
        method: input.method,
        provider: providerSelection.provider,
        status: paymentRecord.status,
        paymentReference: paymentRecord.paymentReference,
        transactionId: paymentRecord.transactionId
      }
    });

    return paymentRecord;
  }

  async confirmOrderPayment(order: OrderSubject, input: PaymentSelectionInput, auditContext: RequestAuditContext) {
    const paymentRecord = await this.ensureOrderPaymentRecord(order);
    const provider = paymentRecord.provider as PaymentProviderCode;
    const status = input.simulateFailure ? 'failed' : this.resolveSubmissionStatus(paymentRecord.method, provider);
    const mergedMetadata =
      input.note || input.metadata
        ? ({
            ...(this.asObject(paymentRecord.metadata) ?? {}),
            ...(input.note ? { note: input.note } : {}),
            ...(this.asObject(input.metadata) ?? {})
          } as Prisma.InputJsonValue)
        : undefined;

    const updated = await this.paymentCoreRepository.updatePaymentRecord(paymentRecord.id, {
      status,
      ...(mergedMetadata !== undefined ? { metadata: mergedMetadata } : {})
    });

    await this.paymentCoreRepository.createAttempt({
      paymentRecordId: paymentRecord.id,
      attemptType: input.simulateFailure ? 'manual' : 'confirm',
      method: paymentRecord.method,
      provider,
      status,
      amountMinor: order.totalAmountMinor,
      currency: order.currency,
      externalId: paymentRecord.externalId,
      transactionId: paymentRecord.transactionId,
      bankReference: paymentRecord.bankReference,
      paymentReference: paymentRecord.paymentReference,
      note: input.note ?? (input.simulateFailure ? 'Marked failed.' : 'Payment submitted for review.'),
      payload: input.note ? ({ note: input.note } as Prisma.InputJsonValue) : undefined
    });

    await this.prismaUpdateOrder(order.id, {
      paymentStatus: this.mapRecordStatusToRetailStatus(status),
    });

    await this.auditService.record({
      module: 'payment-core',
      eventType: status === 'failed' ? 'payment.order.failed' : 'payment.order.submitted',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'payment-record',
      subjectId: paymentRecord.id,
      payload: {
        orderId: order.id,
        method: paymentRecord.method,
        provider,
        status,
        paymentReference: paymentRecord.paymentReference,
        transactionId: paymentRecord.transactionId
      }
    });

    return updated;
  }

  async selectDealPayment(deal: DealSubject, input: PaymentSelectionInput, auditContext: RequestAuditContext) {
    const config = await this.loadPaymentConfig();
    const providerSelection = this.resolveProvider(input.provider, input.method, config);
    const instructions = this.buildInstructions(
      {
        scope: 'deal',
        method: input.method,
        amountMinor: deal.quote?.totalPrice ?? 0,
        currency: deal.quote?.currency ?? deal.rfq?.currency ?? 'USD',
        merchantName: config.platformReceiving.platformLegalName,
        beneficiaryName: config.bankReceiving.beneficiaryName || deal.supplierUserId || 'Supplier',
        bankName: config.bankReceiving.bankName || 'Airwallex Global'
      },
      providerSelection.provider
    );

    const paymentRecord = await this.paymentCoreRepository.upsertPaymentRecord({
      scope: 'deal',
      dealId: deal.id,
      amountMinor: deal.quote?.totalPrice ?? 0,
      currency: deal.quote?.currency ?? deal.rfq?.currency ?? 'USD',
      method: input.method,
      provider: providerSelection.provider,
      status: 'invoice_issued',
      externalId: instructions.externalId,
      transactionId: instructions.transactionId,
      bankReference: instructions.bankReference,
      paymentReference: instructions.paymentReference,
      instructions: instructions.instructions,
      metadata: {
        note: input.note ?? null,
        providerSelection: {
          requestedProvider: input.provider ?? null,
          resolvedProvider: providerSelection.provider,
          fallbackReason: providerSelection.fallbackReason,
          providerReady: providerSelection.ready
        }
      }
    });

    await this.paymentCoreRepository.createAttempt({
      paymentRecordId: paymentRecord.id,
      attemptType: 'initiate',
      method: input.method,
      provider: providerSelection.provider,
      status: paymentRecord.status,
      amountMinor: paymentRecord.amountMinor,
      currency: paymentRecord.currency,
      externalId: paymentRecord.externalId,
      transactionId: paymentRecord.transactionId,
      bankReference: paymentRecord.bankReference,
      paymentReference: paymentRecord.paymentReference,
      note: input.note ?? null,
      payload: paymentRecord.instructions ?? undefined
    });

    await this.auditService.record({
      module: 'payment-core',
      eventType: 'payment.deal.invoice.issued',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'payment-record',
      subjectId: paymentRecord.id,
      payload: {
        dealId: deal.id,
        method: input.method,
        provider: providerSelection.provider,
        status: paymentRecord.status,
        paymentReference: paymentRecord.paymentReference,
        transactionId: paymentRecord.transactionId
      }
    });

    return paymentRecord;
  }

  async confirmDealPayment(deal: DealSubject, input: PaymentSelectionInput, auditContext: RequestAuditContext) {
    const config = await this.loadPaymentConfig();
    let paymentRecord = await this.paymentCoreRepository.getPaymentByDealId(deal.id);

    if (!paymentRecord) {
      paymentRecord = await this.paymentCoreRepository.upsertPaymentRecord({
        scope: 'deal',
        dealId: deal.id,
        amountMinor: deal.quote?.totalPrice ?? 0,
        currency: deal.quote?.currency ?? deal.rfq?.currency ?? 'USD',
        method: input.method ?? 'manual',
        provider: this.resolveProvider(input.provider, input.method ?? 'manual', config).provider,
        status: 'invoice_issued',
        instructions: {
          scope: 'deal',
          method: input.method ?? 'manual',
          amountMinor: deal.quote?.totalPrice ?? 0,
          currency: deal.quote?.currency ?? deal.rfq?.currency ?? 'USD',
          invoiceNumber: `INV-${deal.id.slice(0, 8).toUpperCase()}`
        }
      });
    }

    const provider = paymentRecord.provider as PaymentProviderCode;
    const status = input.simulateFailure ? 'failed' : this.resolveSubmissionStatus(paymentRecord.method, provider);
    const mergedMetadata =
      input.note || input.metadata
        ? ({
            ...(this.asObject(paymentRecord.metadata) ?? {}),
            ...(input.note ? { note: input.note } : {}),
            ...(this.asObject(input.metadata) ?? {})
          } as Prisma.InputJsonValue)
        : undefined;

    const updated = await this.paymentCoreRepository.updatePaymentRecord(paymentRecord.id, {
      status,
      ...(mergedMetadata !== undefined ? { metadata: mergedMetadata } : {})
    });

    await this.paymentCoreRepository.createAttempt({
      paymentRecordId: paymentRecord.id,
      attemptType: input.simulateFailure ? 'manual' : 'confirm',
      method: paymentRecord.method,
      provider,
      status,
      amountMinor: paymentRecord.amountMinor,
      currency: paymentRecord.currency,
      externalId: paymentRecord.externalId,
      transactionId: paymentRecord.transactionId,
      bankReference: paymentRecord.bankReference,
      paymentReference: paymentRecord.paymentReference,
      note: input.note ?? (input.simulateFailure ? 'Marked failed.' : 'Funding request submitted for review.'),
      payload: input.note ? ({ note: input.note } as Prisma.InputJsonValue) : undefined
    });

    await this.auditService.record({
      module: 'payment-core',
      eventType: status === 'failed' ? 'payment.deal.failed' : 'payment.deal.submitted',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'payment-record',
      subjectId: paymentRecord.id,
      payload: {
        dealId: deal.id,
        method: paymentRecord.method,
        provider,
        status,
        paymentReference: paymentRecord.paymentReference,
        transactionId: paymentRecord.transactionId
      }
    });

    return updated;
  }

  async createOrderPaymentPreview(order: OrderSubject, input: PaymentSelectionInput, auditContext: RequestAuditContext) {
    return this.selectOrderPayment(order, input, auditContext);
  }

  async createDealPaymentPreview(deal: DealSubject, input: PaymentSelectionInput, auditContext: RequestAuditContext) {
    return this.selectDealPayment(deal, input, auditContext);
  }

  private async loadPaymentConfig(): Promise<PaymentConfigSnapshot> {
    await this.adminOpsRepository.ensureDefaultSettings(defaultAdminSettings);
    const rows = await this.adminOpsRepository.listSettings();

    return {
      paymentProviders: {
        airwallex: this.readProvider(rows, adminSettingKeys.airwallexProvider),
        internal_manual: this.readProvider(rows, adminSettingKeys.internalManualProvider),
        bank_transfer: this.readProvider(rows, adminSettingKeys.bankTransferProvider)
      },
      bankReceiving: {
        beneficiaryName: this.readStringSetting(rows, adminSettingKeys.bankReceiving, 'beneficiaryName', 'Alemhub Corp'),
        bankName: this.readStringSetting(rows, adminSettingKeys.bankReceiving, 'bankName', 'Airwallex Global')
      },
      platformReceiving: {
        platformLegalName: this.readStringSetting(rows, adminSettingKeys.platformReceiving, 'platformLegalName', 'Alemhub Corp')
      },
      paymentRouting: this.readRouting(rows)
    };
  }

  private resolveProvider(provider: PaymentProviderCode | undefined, method: PaymentMethod, config: PaymentConfigSnapshot): {
    provider: PaymentProviderCode;
    ready: boolean;
    fallbackReason: string | null;
  } {
    const requested = this.resolveRequestedProvider(provider, method, config);

    if (requested === 'airwallex') {
      const ready = this.isAirwallexReady(config.paymentProviders.airwallex);
      return ready
        ? { provider: 'airwallex', ready: true, fallbackReason: null }
        : { provider: 'internal_manual', ready: false, fallbackReason: 'airwallex credentials or enablement missing' };
    }

    return {
      provider: 'internal_manual',
      ready: this.isProviderReady(config.paymentProviders.internal_manual),
      fallbackReason: requested === 'none' ? 'explicit none provider requested' : null
    };
  }

  private resolveRequestedProvider(provider: PaymentProviderCode | undefined, method: PaymentMethod, config: PaymentConfigSnapshot) {
    if (provider && provider !== 'none') {
      return provider;
    }

    return (config.paymentRouting[method] ?? (method === 'card' || method === 'qr' ? 'airwallex' : 'internal_manual')) as PaymentProviderCode;
  }

  private readProvider(rows: AdminSettingRow[], key: string): ProviderConnection {
    const value = getSettingValue(rows, key);
    const record = isPlainObject(value) ? value : {};

    return {
      providerName: getString(record.providerName, key),
      providerType: getString(record.providerType, key),
      enabled: getBoolean(record.enabled, false),
      mode: getString(record.mode, 'test'),
      publicKey: getString(record.publicKey, ''),
      secretKey: getString(record.secretKey, ''),
      webhookSecret: getString(record.webhookSecret, ''),
      merchantId: getString(record.merchantId, ''),
      terminalId: getString(record.terminalId, ''),
      accountId: getString(record.accountId, ''),
      clientId: getString(record.clientId, ''),
      clientSecret: getString(record.clientSecret, ''),
      apiBaseUrl: getString(record.apiBaseUrl, ''),
      callbackUrl: getString(record.callbackUrl, ''),
      returnUrl: getString(record.returnUrl, '/orders'),
      statusEndpoint: getString(record.statusEndpoint, ''),
      notes: getString(record.notes, '')
    };
  }

  private readStringSetting(rows: AdminSettingRow[], key: string, field: string, fallback: string) {
    const value = getSettingValue(rows, key);
    const record = isPlainObject(value) ? value : {};
    return getString(record[field], fallback);
  }

  private readRouting(rows: AdminSettingRow[]) {
    const routing = isPlainObject(getSettingValue(rows, adminSettingKeys.paymentRouting))
      ? (getSettingValue(rows, adminSettingKeys.paymentRouting) as Record<string, unknown>)
      : {};

    return {
      card: getString(routing.card, 'airwallex'),
      qr: getString(routing.qr, 'airwallex'),
      bank_transfer: getString(routing.bank_transfer, 'internal_manual'),
      swift: getString(routing.swift, 'internal_manual'),
      iban_invoice: getString(routing.iban_invoice, 'internal_manual'),
      manual: getString(routing.manual, 'internal_manual')
    } satisfies Record<PaymentMethod, string>;
  }

  private isProviderReady(connection: ProviderConnection) {
    return connection.enabled && (connection.providerType === 'internal_manual' || Boolean(connection.secretKey || connection.clientSecret || connection.webhookSecret || connection.accountId));
  }

  private isAirwallexReady(connection: ProviderConnection) {
    return connection.enabled && connection.providerType === 'airwallex' && this.isProviderReady(connection);
  }

  private buildInstructions(
    input: {
      scope: 'order' | 'deal';
      method: PaymentMethod;
      amountMinor: number;
      currency: string;
      merchantName: string;
      beneficiaryName: string;
      bankName: string;
    },
    provider: PaymentProviderCode
  ) {
    if (provider === 'airwallex') {
      return this.airwallexProvider.buildInstructions(input);
    }

    return this.internalManualProvider.buildInstructions(input);
  }

  private mapRecordStatusToRetailStatus(status: PaymentRecordStatus): 'pending' | 'awaiting_transfer' | 'awaiting_confirmation' | 'paid' | 'failed' | 'cancelled' | 'refunded' {
    if (status === 'paid') {
      return 'paid';
    }

    if (status === 'awaiting_transfer') {
      return 'awaiting_transfer';
    }

    if (status === 'awaiting_confirmation' || status === 'processing' || status === 'authorized' || status === 'requires_review' || status === 'mismatch_detected') {
      return 'awaiting_confirmation';
    }

    if (status === 'failed' || status === 'cancelled' || status === 'refunded') {
      return status;
    }

    return 'pending';
  }

  private resolveSubmissionStatus(method: PaymentMethod, provider: PaymentProviderCode): PaymentRecordStatus {
    if (method === 'card') {
      return provider === 'airwallex' ? 'processing' : 'awaiting_confirmation';
    }

    if (method === 'qr') {
      return 'awaiting_confirmation';
    }

    if (method === 'manual') {
      return 'awaiting_confirmation';
    }

    return 'awaiting_transfer';
  }

  private asObject(value: Prisma.JsonValue | Prisma.InputJsonValue | null | undefined) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private async ensureOrderPaymentRecord(order: OrderSubject) {
    const existing = await this.paymentCoreRepository.getPaymentByOrderId(order.id);

    if (!existing) {
      throw new NotFoundException(`No payment record exists for order ${order.id}.`);
    }

    return existing;
  }

  private async prismaUpdateOrder(
    orderId: string,
    data: Partial<{
      paymentStatus: 'pending' | 'awaiting_transfer' | 'awaiting_confirmation' | 'paid' | 'failed' | 'cancelled' | 'refunded';
      paymentTransactionId: string | null;
      status: string;
    }>
  ) {
    await this.prismaService.client.retailOrder.update({
      where: { id: orderId },
      data: {
        ...(data.paymentStatus ? { paymentStatus: data.paymentStatus } : {}),
        ...(data.paymentTransactionId !== undefined ? { paymentTransactionId: data.paymentTransactionId } : {}),
        ...(data.status ? { status: data.status as never } : {})
      }
    });
  }
}
