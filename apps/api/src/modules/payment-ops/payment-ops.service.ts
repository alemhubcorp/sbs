import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { AuthContext, RequestAuditContext } from '../../app/auth-context.js';
import { ResourceAccessService } from '../../app/resource-access.service.js';
import { PrismaService } from '../../app/prisma.service.js';
import { AuditService } from '../audit-observability/audit.service.js';
import { AdminOpsRepository } from '../admin-ops/admin-ops.repository.js';
import { NotificationService } from '../notifications-core/notification.service.js';
import {
  adminSettingKeys,
  defaultAdminSettings,
  getBoolean,
  getNumber,
  getSettingValue,
  getString,
  isPlainObject,
  type AdminSettingRow
} from '../admin-ops/admin-ops.defaults.js';
import { PaymentCoreRepository } from '../payment-core/payment-core.repository.js';
import type { PaymentMethod, PaymentProviderCode, PaymentRecordStatus } from '../../services/payment/payment.types.js';

const listPaymentsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  scope: z.enum(['order', 'deal']).optional(),
  status: z.string().optional(),
  provider: z.string().optional(),
  method: z.string().optional(),
  reviewOnly: z.coerce.boolean().default(false)
});

const webhookSchema = z.object({
  eventId: z.string().min(1).optional(),
  externalId: z.string().min(1).optional(),
  eventType: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  note: z.string().min(1).max(1000).optional(),
  scope: z.enum(['order', 'deal']).optional(),
  orderId: z.string().optional(),
  dealId: z.string().optional(),
  method: z.enum(['card', 'qr', 'bank_transfer', 'swift', 'iban_invoice', 'manual']).optional(),
  amountMinor: z.coerce.number().int().min(0).optional(),
  currency: z.string().min(1).optional(),
  transactionId: z.string().optional(),
  paymentReference: z.string().optional(),
  bankReference: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  payload: z.record(z.string(), z.any()).optional()
});

const reviewActionSchema = z.object({
  note: z.string().min(1).max(1000).optional(),
  bankReference: z.string().min(1).max(120).optional(),
  paymentReference: z.string().min(1).max(120).optional(),
  transactionId: z.string().min(1).max(120).optional(),
  externalId: z.string().min(1).max(120).optional(),
  amountMinor: z.coerce.number().int().min(0).optional(),
  proofReference: z.string().min(1).max(200).optional(),
  proofImageDataUrl: z.string().min(1).optional(),
  proofFileName: z.string().min(1).max(255).optional(),
  proofMimeType: z.string().min(1).max(120).optional()
});

type PlatformProviderConnection = {
  key: string;
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

type PaymentSettingsDocument = {
  paymentProviders: Record<string, PlatformProviderConnection>;
  bankReceiving: {
    beneficiaryName: string;
    legalEntityName: string;
    bankName: string;
    bankAddress: string;
    accountNumber: string;
    iban: string;
    swiftBic: string;
    routingNumber: string;
    branchCode: string;
    intermediaryBank: string;
    paymentReferencePrefix: string;
    invoicePrefix: string;
    supportEmail: string;
    supportPhone: string;
  };
  platformReceiving: {
    platformLegalName: string;
    platformAddress: string;
    platformRegistrationNumber: string;
    taxVatNumber: string;
    invoicingEmail: string;
    defaultCurrency: string;
    invoiceFooter: string;
    paymentInstructionsText: string;
    complianceDisclaimerText: string;
  };
  compliance: {
    legalDisclaimer: string;
    termsSnippet: string;
    refundPaymentNote: string;
    complianceStatement: string;
    signatureNameTitle: string;
    signatureImageUrl: string;
    companySealImageUrl: string;
  };
  manualPayment: {
    enabled: boolean;
    paymentProofRequired: boolean;
    instructionsText: string;
    whoConfirmsPayments: string;
    proofRequiredFields: string[];
    reviewQueueLabel: string;
    bankTransferInstructions: string;
  };
  email: {
    enabled: boolean;
    provider: string;
    fromEmail: string;
    replyToEmail: string;
    supportEmail: string;
    supportPhone: string;
  };
  paymentRouting: Record<string, string>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value);
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
}

function providerStatus(connection: PlatformProviderConnection | null | undefined) {
  if (!connection) {
    return {
      status: 'missing',
      isReady: false,
      providerName: 'Unknown',
      providerType: 'unknown'
    };
  }

  const hasSecrets = Boolean(connection.secretKey || connection.clientSecret || connection.webhookSecret || connection.accountId);
  const isReady = connection.enabled && (connection.providerType === 'internal_manual' || hasSecrets);

  return {
    status: !connection.enabled ? 'disabled' : isReady ? 'ready' : 'fallback',
    isReady,
    providerName: connection.providerName,
    providerType: connection.providerType
  };
}

function stableHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value ?? {})).digest('hex');
}

function normalizeStatus(input: {
  status?: string | null | undefined;
  eventType?: string | null | undefined;
  fallback?: PaymentRecordStatus | undefined;
}): PaymentRecordStatus {
  const raw = `${input.status ?? ''} ${input.eventType ?? ''}`.toLowerCase();

  if (raw.includes('mismatch')) {
    return 'mismatch_detected';
  }

  if (raw.includes('requires_review') || raw.includes('review') || raw.includes('manual_check')) {
    return 'requires_review';
  }

  if (raw.includes('authorized')) {
    return 'authorized';
  }

  if (raw.includes('processing') || raw.includes('pending')) {
    return 'processing';
  }

  if (raw.includes('refunded')) {
    return 'refunded';
  }

  if (raw.includes('cancel')) {
    return 'cancelled';
  }

  if (raw.includes('fail') || raw.includes('error') || raw.includes('declin')) {
    return 'failed';
  }

  if (raw.includes('awaiting_transfer') || raw.includes('bank_transfer')) {
    return 'awaiting_transfer';
  }

  if (raw.includes('awaiting_confirmation') || raw.includes('hold')) {
    return 'awaiting_confirmation';
  }

  if (raw.includes('paid') || raw.includes('succeed') || raw.includes('captured') || raw.includes('settled') || raw.includes('received')) {
    return 'paid';
  }

  return input.fallback ?? 'pending';
}

@Injectable()
export class PaymentOpsService {
  constructor(
    @Inject(PaymentCoreRepository) private readonly paymentCoreRepository: PaymentCoreRepository,
    @Inject(AdminOpsRepository) private readonly adminOpsRepository: AdminOpsRepository,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(NotificationService) private readonly notificationService: NotificationService,
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(ResourceAccessService) private readonly resourceAccessService: ResourceAccessService
  ) {}

  async listPayments(query: unknown, authContext: AuthContext) {
    this.ensureAdmin(authContext);
    const parsed = listPaymentsSchema.parse(query);
    const settings = await this.loadSettings();
    const records = await this.paymentCoreRepository.listPayments();
    const filtered = this.filterPayments(records as any[], parsed);

    return {
      items: filtered.slice(0, parsed.limit).map((payment) => this.mapPayment(payment)),
      summary: this.buildSummary(filtered),
      providerStatus: this.buildProviderStatus(settings),
      manualPayment: settings.manualPayment,
      email: settings.email
    };
  }

  async listReviewQueue(query: unknown, authContext: AuthContext) {
    this.ensureAdmin(authContext);
    const parsed = listPaymentsSchema.parse(query);
    const records = await this.paymentCoreRepository.listPayments();
    const filtered = this.filterReviewQueue(records as any[], parsed);

    return {
      items: filtered.slice(0, parsed.limit).map((payment) => this.mapPayment(payment)),
      summary: this.buildSummary(filtered)
    };
  }

  async getPaymentById(id: string, authContext: AuthContext) {
    this.ensureAdmin(authContext);
    return this.enrichPayment(await this.paymentCoreRepository.getPaymentById(id));
  }

  async markPaid(id: string, input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    this.ensureAdmin(authContext);
    const parsed = reviewActionSchema.parse(input);
    const payment = await this.getPaymentRecord(id);

    const updated = await this.transitionPayment(payment, 'paid', {
      ...(parsed.transactionId !== undefined ? { transactionId: parsed.transactionId } : {}),
      ...(parsed.bankReference !== undefined ? { bankReference: parsed.bankReference } : {}),
      ...(parsed.paymentReference !== undefined ? { paymentReference: parsed.paymentReference } : {}),
      ...(parsed.externalId !== undefined ? { externalId: parsed.externalId } : {}),
      note: parsed.note ?? 'Marked paid from admin review.',
      proof: this.buildProofPayload(parsed)
    });

    await this.recordAudit('payment.admin.mark_paid', updated, auditContext, {
      note: parsed.note ?? null
    });

    await this.emitPaymentNotification(updated as any, 'payment.approved', 'Payment approved', 'The payment was marked as paid by admin review.');

    return updated;
  }

  async rejectPayment(id: string, input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    this.ensureAdmin(authContext);
    const parsed = reviewActionSchema.parse(input);
    const payment = await this.getPaymentRecord(id);
    const updated = await this.transitionPayment(payment, 'failed', {
      ...(parsed.transactionId !== undefined ? { transactionId: parsed.transactionId } : {}),
      ...(parsed.bankReference !== undefined ? { bankReference: parsed.bankReference } : {}),
      ...(parsed.paymentReference !== undefined ? { paymentReference: parsed.paymentReference } : {}),
      ...(parsed.externalId !== undefined ? { externalId: parsed.externalId } : {}),
      note: parsed.note ?? 'Rejected from admin review.',
      proof: this.buildProofPayload(parsed)
    });

    await this.recordAudit('payment.admin.rejected', updated, auditContext, {
      note: parsed.note ?? null
    });

    await this.emitPaymentNotification(updated as any, 'payment.rejected', 'Payment rejected', 'The payment was rejected by admin review.');

    return updated;
  }

  async requestCorrection(id: string, input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    this.ensureAdmin(authContext);
    const parsed = reviewActionSchema.parse(input);
    const payment = await this.getPaymentRecord(id);
    const updated = await this.transitionPayment(payment, 'mismatch_detected', {
      ...(parsed.transactionId !== undefined ? { transactionId: parsed.transactionId } : {}),
      ...(parsed.bankReference !== undefined ? { bankReference: parsed.bankReference } : {}),
      ...(parsed.paymentReference !== undefined ? { paymentReference: parsed.paymentReference } : {}),
      ...(parsed.externalId !== undefined ? { externalId: parsed.externalId } : {}),
      note: parsed.note ?? 'Manual correction requested.',
      proof: this.buildProofPayload(parsed)
    });

    await this.recordAudit('payment.admin.request_correction', updated, auditContext, {
      note: parsed.note ?? null
    });

    await this.emitPaymentNotification(updated as any, 'payment.review_required', 'Payment needs correction', 'The payment requires correction before it can be approved.');

    return updated;
  }

  async uploadProof(id: string, input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    this.ensureAdmin(authContext);
    const parsed = reviewActionSchema.parse(input);
    const payment = await this.getPaymentRecord(id);
    const proof = this.buildProofPayload(parsed);

    const updated = await this.transitionPayment(payment, 'requires_review', {
      ...(parsed.transactionId !== undefined ? { transactionId: parsed.transactionId } : {}),
      ...(parsed.bankReference !== undefined ? { bankReference: parsed.bankReference } : {}),
      ...(parsed.paymentReference !== undefined ? { paymentReference: parsed.paymentReference } : {}),
      ...(parsed.externalId !== undefined ? { externalId: parsed.externalId } : {}),
      note: parsed.note ?? 'Payment proof uploaded for review.',
      proof
    });

    await this.recordAudit('payment.admin.proof_uploaded', updated, auditContext, {
      note: parsed.note ?? null
    });

    await this.emitPaymentNotification(updated as any, 'payment.proof_uploaded', 'Payment proof uploaded', 'Payment proof was uploaded and is waiting for review.');

    return updated;
  }

  async ingestWebhook(
    providerKey: string,
    input: unknown,
    headers: Record<string, string | string[] | undefined>,
    rawBody: string | Buffer | undefined,
    auditContext: RequestAuditContext
  ) {
    const parsed = webhookSchema.parse(input);
    const settings = await this.loadSettings();
    const provider = settings.paymentProviders[providerKey] ?? null;
    const eventId = parsed.eventId ?? parsed.externalId ?? parsed.transactionId ?? parsed.paymentReference ?? `evt_${stableHash(parsed)}`;
    const inboxProvider = `payment-webhook:${providerKey}`;
    const signatureValid = this.validateWebhook(headers, provider, rawBody ?? JSON.stringify(input ?? {}));
    const rawPayload = {
      providerKey,
      receivedAt: new Date().toISOString(),
      headers,
      body: parsed,
      signatureValid,
      providerStatus: providerStatus(provider)
    };

    const existingInbox = await this.prismaService.client.inboxMessage.findUnique({
      where: {
        provider_externalId: {
          provider: inboxProvider,
          externalId: eventId
        }
      }
    });

    if (existingInbox?.status === 'processed') {
      return {
        duplicate: true,
        provider: providerKey,
        eventId,
        status: 'processed'
      };
    }

    if (!signatureValid) {
      await this.prismaService.client.inboxMessage.upsert({
        where: {
          provider_externalId: {
            provider: inboxProvider,
            externalId: eventId
          }
        },
        create: {
          provider: inboxProvider,
          externalId: eventId,
          payload: rawPayload,
          status: 'rejected',
          correlationId: auditContext.correlationId ?? null
        },
        update: {
          payload: rawPayload,
          status: 'rejected'
        }
      });

      throw new ForbiddenException('Invalid payment webhook signature.');
    }

    const payment = await this.findOrCreatePaymentFromWebhook(parsed, providerKey, provider);
    const resolvedStatus = this.resolveWebhookStatus(parsed, payment.status as PaymentRecordStatus);
    const mismatchDetected = this.detectMismatch(payment, parsed);
    const finalStatus = mismatchDetected ? 'mismatch_detected' : resolvedStatus;

    const storedPayment = await this.paymentCoreRepository.updatePaymentRecord(payment.id, {
      status: finalStatus,
      externalId: parsed.externalId ?? payment.externalId ?? null,
      transactionId: parsed.transactionId ?? payment.transactionId ?? null,
      bankReference: parsed.bankReference ?? payment.bankReference ?? null,
      paymentReference: parsed.paymentReference ?? payment.paymentReference ?? null,
      metadata: {
        ...(isRecord(payment.metadata) ? payment.metadata : {}),
        webhook: {
          provider: providerKey,
          eventId,
          signatureValid,
          rawStatus: parsed.status ?? null,
          eventType: parsed.eventType ?? null,
          mismatchDetected
        }
      } as Prisma.InputJsonValue
    });

    await this.paymentCoreRepository.createAttempt({
      paymentRecordId: payment.id,
      attemptType: 'webhook',
      method: payment.method as PaymentMethod,
      provider: payment.provider as PaymentProviderCode,
      status: finalStatus,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      externalId: parsed.externalId ?? payment.externalId ?? null,
      transactionId: parsed.transactionId ?? payment.transactionId ?? null,
      bankReference: parsed.bankReference ?? payment.bankReference ?? null,
      paymentReference: parsed.paymentReference ?? payment.paymentReference ?? null,
      note: parsed.note ?? parsed.eventType ?? 'Webhook received.',
      payload: rawPayload as Prisma.InputJsonValue
    });

    await this.syncRelatedRecords(storedPayment as any, finalStatus);

    await this.prismaService.client.inboxMessage.upsert({
      where: {
        provider_externalId: {
          provider: inboxProvider,
          externalId: eventId
        }
      },
      create: {
        provider: inboxProvider,
        externalId: eventId,
        payload: {
          ...rawPayload,
          paymentRecordId: payment.id,
          paymentStatus: finalStatus
        },
        status: 'processed',
        correlationId: payment.id
      },
      update: {
        payload: {
          ...rawPayload,
          paymentRecordId: payment.id,
          paymentStatus: finalStatus
        },
        status: 'processed',
        processedAt: new Date(),
        correlationId: payment.id
      }
    });

    await this.auditService.record({
      module: 'payment-ops',
      eventType: mismatchDetected ? 'payment.webhook.mismatch_detected' : 'payment.webhook.received',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'payment-record',
      subjectId: payment.id,
      payload: {
        provider: providerKey,
        eventId,
        status: finalStatus,
        mismatchDetected,
        signatureValid
      }
    });

    await this.emitPaymentNotification(
      storedPayment as any,
      finalStatus === 'paid'
        ? 'payment.received'
        : finalStatus === 'failed'
          ? 'payment.failed'
          : finalStatus === 'refunded'
            ? 'payment.refunded'
            : 'payment.updated',
      finalStatus === 'paid'
        ? 'Payment received'
        : finalStatus === 'failed'
          ? 'Payment failed'
          : finalStatus === 'refunded'
            ? 'Payment refunded'
            : 'Payment updated',
      finalStatus === 'paid'
        ? 'A provider event confirmed the payment.'
        : finalStatus === 'failed'
          ? 'A provider event marked the payment as failed.'
          : finalStatus === 'refunded'
            ? 'A provider event marked the payment as refunded.'
            : 'A provider event updated the payment status.'
    );

    return {
      duplicate: false,
      provider: providerKey,
      eventId,
      payment: this.mapPayment(storedPayment as any),
      status: finalStatus,
      signatureValid,
      fallbackMode: !provider || !provider.enabled || providerStatus(provider).status !== 'ready'
    };
  }

  async getPaymentDetail(id: string, authContext: AuthContext) {
    this.ensureAdmin(authContext);
    const payment = await this.enrichPayment(await this.paymentCoreRepository.getPaymentById(id));
    const webhookEvents = await this.prismaService.client.inboxMessage.findMany({
      where: {
        correlationId: payment.id,
        provider: {
          startsWith: 'payment-webhook:'
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return {
      ...payment,
      webhookEvents: webhookEvents.map((event) => ({
        id: event.id,
        provider: event.provider,
        externalId: event.externalId,
        status: event.status,
        processedAt: event.processedAt,
        createdAt: event.createdAt,
        payload: event.payload
      })),
      providerStatus: this.buildProviderStatus(await this.loadSettings())
    };
  }

  private async getPaymentRecord(id: string) {
    return this.paymentCoreRepository.getPaymentById(id);
  }

  private async getSettingsDocument() {
    await this.adminOpsRepository.ensureDefaultSettings(defaultAdminSettings);
    const rows = await this.adminOpsRepository.listSettings();
    return this.buildSettingsDocument(rows);
  }

  private async loadSettings() {
    return this.getSettingsDocument();
  }

  private buildSettingsDocument(rows: AdminSettingRow[]): PaymentSettingsDocument {
    const providerMap = {
      airwallex: this.readProvider(rows, adminSettingKeys.airwallexProvider),
      internal_manual: this.readProvider(rows, adminSettingKeys.internalManualProvider),
      bank_transfer: this.readProvider(rows, adminSettingKeys.bankTransferProvider)
    };

    return {
      paymentProviders: providerMap,
      bankReceiving: this.readBank(rows),
      platformReceiving: this.readPlatform(rows),
      compliance: this.readCompliance(rows),
      manualPayment: this.readManualPayment(rows),
      email: this.readEmail(rows),
      paymentRouting: this.readRouting(rows)
    };
  }

  private readProvider(rows: AdminSettingRow[], key: string): PlatformProviderConnection {
    const value = getSettingValue(rows, key);
    const record = isRecord(value) ? value : {};

    return {
      key,
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

  private readBank(rows: AdminSettingRow[]) {
    const bank = isRecord(getSettingValue(rows, adminSettingKeys.bankReceiving))
      ? (getSettingValue(rows, adminSettingKeys.bankReceiving) as Record<string, unknown>)
      : {};
    const platform = isRecord(getSettingValue(rows, adminSettingKeys.platformReceiving))
      ? (getSettingValue(rows, adminSettingKeys.platformReceiving) as Record<string, unknown>)
      : {};
    const email = isRecord(getSettingValue(rows, adminSettingKeys.email)) ? (getSettingValue(rows, adminSettingKeys.email) as Record<string, unknown>) : {};

    return {
      beneficiaryName: getString(bank.beneficiaryName, getString(platform.platformLegalName, 'Alemhub Corp')),
      legalEntityName: getString(bank.legalEntityName, getString(platform.platformLegalName, 'Alemhub Corp')),
      bankName: getString(bank.bankName, ''),
      bankAddress: getString(bank.bankAddress, ''),
      accountNumber: getString(bank.accountNumber, ''),
      iban: getString(bank.iban, ''),
      swiftBic: getString(bank.swiftBic, ''),
      routingNumber: getString(bank.routingNumber, ''),
      branchCode: getString(bank.branchCode, ''),
      intermediaryBank: getString(bank.intermediaryBank, ''),
      paymentReferencePrefix: getString(bank.paymentReferencePrefix, 'AH'),
      invoicePrefix: getString(bank.invoicePrefix, 'AH'),
      supportEmail: getString(bank.supportEmail, getString(email.supportEmail, 'support@alemhub.sbs')),
      supportPhone: getString(bank.supportPhone, getString(email.supportPhone, ''))
    };
  }

  private readPlatform(rows: AdminSettingRow[]) {
    const platform = isRecord(getSettingValue(rows, adminSettingKeys.platformReceiving))
      ? (getSettingValue(rows, adminSettingKeys.platformReceiving) as Record<string, unknown>)
      : {};

    return {
      platformLegalName: getString(platform.platformLegalName, 'Alemhub Corp'),
      platformAddress: getString(platform.platformAddress, ''),
      platformRegistrationNumber: getString(platform.platformRegistrationNumber, ''),
      taxVatNumber: getString(platform.taxVatNumber, ''),
      invoicingEmail: getString(platform.invoicingEmail, 'billing@alemhub.sbs'),
      defaultCurrency: getString(platform.defaultCurrency, 'USD'),
      invoiceFooter: getString(platform.invoiceFooter, ''),
      paymentInstructionsText: getString(platform.paymentInstructionsText, ''),
      complianceDisclaimerText: getString(platform.complianceDisclaimerText, '')
    };
  }

  private readCompliance(rows: AdminSettingRow[]) {
    const compliance = isRecord(getSettingValue(rows, adminSettingKeys.compliance))
      ? (getSettingValue(rows, adminSettingKeys.compliance) as Record<string, unknown>)
      : {};

    return {
      legalDisclaimer: getString(compliance.legalDisclaimer, ''),
      termsSnippet: getString(compliance.termsSnippet, ''),
      refundPaymentNote: getString(compliance.refundPaymentNote, ''),
      complianceStatement: getString(compliance.complianceStatement, ''),
      signatureNameTitle: getString(compliance.signatureNameTitle, 'Authorized Signatory'),
      signatureImageUrl: getString(compliance.signatureImageUrl, ''),
      companySealImageUrl: getString(compliance.companySealImageUrl, '')
    };
  }

  private readManualPayment(rows: AdminSettingRow[]) {
    const manual = isRecord(getSettingValue(rows, adminSettingKeys.manualPayment))
      ? (getSettingValue(rows, adminSettingKeys.manualPayment) as Record<string, unknown>)
      : {};

    return {
      enabled: getBoolean(manual.enabled, true),
      paymentProofRequired: getBoolean(manual.paymentProofRequired, true),
      instructionsText: getString(manual.instructionsText, ''),
      whoConfirmsPayments: getString(manual.whoConfirmsPayments, 'admin'),
      proofRequiredFields: toStringArray(manual.proofRequiredFields),
      reviewQueueLabel: getString(manual.reviewQueueLabel, 'Manual payment review'),
      bankTransferInstructions: getString(manual.bankTransferInstructions, '')
    };
  }

  private readEmail(rows: AdminSettingRow[]) {
    const email = isRecord(getSettingValue(rows, adminSettingKeys.email))
      ? (getSettingValue(rows, adminSettingKeys.email) as Record<string, unknown>)
      : {};

    return {
      enabled: getBoolean(email.enabled, false),
      provider: getString(email.provider, 'smtp'),
      fromEmail: getString(email.fromEmail, 'noreply@alemhub.sbs'),
      replyToEmail: getString(email.replyToEmail, 'support@alemhub.sbs'),
      supportEmail: getString(email.supportEmail, 'support@alemhub.sbs'),
      supportPhone: getString(email.supportPhone, '')
    };
  }

  private readRouting(rows: AdminSettingRow[]) {
    const routing = isRecord(getSettingValue(rows, adminSettingKeys.paymentRouting))
      ? (getSettingValue(rows, adminSettingKeys.paymentRouting) as Record<string, unknown>)
      : {};

    return {
      card: getString(routing.card, 'airwallex'),
      qr: getString(routing.qr, 'airwallex'),
      bank_transfer: getString(routing.bank_transfer, 'bank_transfer'),
      swift: getString(routing.swift, 'bank_transfer'),
      iban_invoice: getString(routing.iban_invoice, 'bank_transfer'),
      manual: getString(routing.manual, 'internal_manual')
    };
  }

  private buildProviderStatus(settings: PaymentSettingsDocument) {
    return Object.fromEntries(
      Object.entries(settings.paymentProviders).map(([key, value]) => {
        const state = providerStatus(value);
        return [key, state];
      })
    );
  }

  private buildSummary(payments: any[]) {
    const counts = payments.reduce(
      (acc, payment) => {
        acc.total += 1;
        acc[payment.status] = (acc[payment.status] ?? 0) + 1;
        if (this.isReviewState(payment.status)) {
          acc.review += 1;
        }
        return acc;
      },
      { total: 0, review: 0 } as Record<string, number>
    );

    return counts;
  }

  private filterPayments(payments: any[], query: z.infer<typeof listPaymentsSchema>) {
    let items = [...payments];

    if (query.scope) {
      items = items.filter((payment) => payment.scope === query.scope);
    }

    if (query.provider) {
      items = items.filter((payment) => payment.provider === query.provider);
    }

    if (query.method) {
      items = items.filter((payment) => payment.method === query.method);
    }

    if (query.status) {
      const statuses = query.status.split(',').map((entry) => entry.trim()).filter(Boolean);
      items = items.filter((payment) => statuses.includes(payment.status));
    }

    if (query.reviewOnly) {
      items = items.filter((payment) => this.isReviewState(payment.status) || this.needsManualReview(payment));
    }

    return items;
  }

  private filterReviewQueue(payments: any[], query: z.infer<typeof listPaymentsSchema>) {
    return this.filterPayments(payments, {
      ...query,
      reviewOnly: true
    });
  }

  private mapPayment(payment: any) {
    return {
      id: payment.id,
      scope: payment.scope,
      orderId: payment.orderId ?? null,
      dealId: payment.dealId ?? null,
      status: payment.status,
      method: payment.method,
      provider: payment.provider,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      externalId: payment.externalId ?? null,
      transactionId: payment.transactionId ?? null,
      bankReference: payment.bankReference ?? null,
      paymentReference: payment.paymentReference ?? null,
      createdAt: payment.createdAt?.toISOString?.() ?? payment.createdAt,
      updatedAt: payment.updatedAt?.toISOString?.() ?? payment.updatedAt,
      reviewState: this.isReviewState(payment.status) ? 'needs_review' : 'clear',
      orderStatus: payment.retailOrder?.status ?? null,
      dealStatus: payment.deal?.dealStatus ?? null,
      buyer: payment.retailOrder?.buyerProfile?.displayName ?? payment.deal?.rfq?.buyerProfile?.displayName ?? null,
      supplier:
        payment.retailOrder?.supplierProfile?.displayName ??
        payment.deal?.sellerProfile?.displayName ??
        payment.deal?.quote?.sellerProfile?.displayName ??
        null
    };
  }

  private async enrichPayment(payment: any) {
    const settings = await this.loadSettings();
    return {
      ...this.mapPayment(payment),
      amountFormatted: `${payment.currency} ${(payment.amountMinor / 100).toFixed(2)}`,
      instructions: payment.instructions,
      metadata: payment.metadata,
      attempts: payment.attempts?.map((attempt: any) => ({
        id: attempt.id,
        attemptType: attempt.attemptType,
        method: attempt.method,
        provider: attempt.provider,
        status: attempt.status,
        amountMinor: attempt.amountMinor,
        currency: attempt.currency,
        externalId: attempt.externalId ?? null,
        transactionId: attempt.transactionId ?? null,
        bankReference: attempt.bankReference ?? null,
        paymentReference: attempt.paymentReference ?? null,
        note: attempt.note ?? null,
        payload: attempt.payload ?? null,
        createdAt: attempt.createdAt?.toISOString?.() ?? attempt.createdAt
      })) ?? [],
      providerStatus: this.buildProviderStatus(settings),
      manualPayment: settings.manualPayment,
      email: settings.email
    };
  }

  private async transitionPayment(
    payment: any,
    status: PaymentRecordStatus,
    input: {
      transactionId?: string | null | undefined;
      bankReference?: string | null | undefined;
      paymentReference?: string | null | undefined;
      externalId?: string | null | undefined;
      note?: string | null | undefined;
      proof?: Prisma.InputJsonValue | null | undefined;
    }
  ) {
    const updated = await this.paymentCoreRepository.updatePaymentRecord(payment.id, {
      status,
      transactionId: input.transactionId ?? payment.transactionId ?? null,
      bankReference: input.bankReference ?? payment.bankReference ?? null,
      paymentReference: input.paymentReference ?? payment.paymentReference ?? null,
      externalId: input.externalId ?? payment.externalId ?? null,
      metadata: {
        ...(isRecord(payment.metadata) ? payment.metadata : {}),
        review: {
          note: input.note ?? null,
          proof: input.proof ?? null,
          updatedAt: new Date().toISOString()
        }
      } as Prisma.InputJsonValue
    });

    await this.paymentCoreRepository.createAttempt({
      paymentRecordId: payment.id,
      attemptType: 'manual',
      method: payment.method,
      provider: payment.provider,
      status,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      externalId: input.externalId ?? payment.externalId ?? null,
      transactionId: input.transactionId ?? payment.transactionId ?? null,
      bankReference: input.bankReference ?? payment.bankReference ?? null,
      paymentReference: input.paymentReference ?? payment.paymentReference ?? null,
      note: input.note ?? null,
      payload: input.proof ?? undefined
    });

    await this.syncRelatedRecords(updated as any, status);
    return updated;
  }

  private async syncRelatedRecords(payment: any, status: PaymentRecordStatus) {
    if (payment.scope === 'order' && payment.orderId) {
      const orderStatus = this.mapOrderStatus(status);
      await this.prismaService.client.retailOrder.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: orderStatus,
          ...(status === 'paid' ? { status: 'paid' } : {})
        }
      });
      return;
    }

    if (payment.scope === 'deal' && payment.dealId) {
      if (status === 'paid') {
        const deal = await this.prismaService.client.contractRfqDeal.findUnique({
          where: { id: payment.dealId },
          select: { id: true, dealStatus: true }
        });

        if (deal && deal.dealStatus === 'accepted') {
          await this.prismaService.client.contractRfqDeal.update({
            where: { id: deal.id },
            data: {
              dealStatus: 'in_escrow',
              buyerStatus: 'active',
              supplierStatus: 'pending'
            }
          });
        }
      }
    }
  }

  private mapOrderStatus(status: PaymentRecordStatus) {
    if (status === 'paid') {
      return 'paid';
    }

    if (status === 'awaiting_transfer') {
      return 'awaiting_transfer';
    }

    if (status === 'awaiting_confirmation' || status === 'processing' || status === 'authorized' || status === 'requires_review' || status === 'mismatch_detected') {
      return 'awaiting_confirmation';
    }

    if (status === 'refunded' || status === 'cancelled' || status === 'failed') {
      return status;
    }

    return 'pending';
  }

  private isReviewState(status: PaymentRecordStatus) {
    return ['requires_review', 'mismatch_detected', 'awaiting_confirmation', 'processing', 'authorized'].includes(status);
  }

  private detectMismatch(payment: any, input: z.infer<typeof webhookSchema>) {
    return typeof input.amountMinor === 'number' && payment.amountMinor !== input.amountMinor;
  }

  private needsManualReview(payment: any) {
    return payment.method === 'manual' || payment.method === 'bank_transfer' || payment.status === 'requires_review' || payment.status === 'mismatch_detected';
  }

  private buildProofPayload(input: z.infer<typeof reviewActionSchema>) {
    if (!input.proofReference && !input.proofImageDataUrl && !input.proofFileName && !input.proofMimeType) {
      return null;
    }

    return {
      proofReference: input.proofReference ?? null,
      proofImageDataUrl: input.proofImageDataUrl ?? null,
      proofFileName: input.proofFileName ?? null,
      proofMimeType: input.proofMimeType ?? null
    } satisfies Prisma.InputJsonValue;
  }

  private validateWebhook(
    headers: Record<string, string | string[] | undefined>,
    provider: PlatformProviderConnection | null,
    payload: string | Buffer
  ) {
    if (!provider || !provider.enabled) {
      return false;
    }

    const secret = provider.webhookSecret;
    if (!secret) {
      return false;
    }

    const timestamp = this.readHeader(headers, 'x-webhook-timestamp') ?? this.readHeader(headers, 'x-airwallex-timestamp');
    if (!timestamp || !this.isWebhookTimestampFresh(timestamp)) {
      return false;
    }

    const headerValue = this.readHeader(headers, 'x-webhook-signature') ?? this.readHeader(headers, 'x-airwallex-signature');
    if (!headerValue) return false;

    const rawPayload = Buffer.isBuffer(payload) ? payload.toString('utf8') : payload;
    const signedPayload = `${timestamp}.${rawPayload}`;
    const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');
    return this.safeCompareSignature(headerValue, expected);
  }

  private readHeader(headers: Record<string, string | string[] | undefined>, name: string) {
    const value = headers[name] ?? headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value ?? null;
  }

  private isWebhookTimestampFresh(timestamp: string) {
    const numeric = Number(timestamp);
    const timestampMs = Number.isFinite(numeric)
      ? (numeric > 1_000_000_000_000 ? numeric : numeric * 1000)
      : Date.parse(timestamp);

    if (!Number.isFinite(timestampMs)) {
      return false;
    }

    return Math.abs(Date.now() - timestampMs) <= 5 * 60 * 1000;
  }

  private safeCompareSignature(headerValue: string, expectedHex: string) {
    const candidate = headerValue.trim().replace(/^sha256=/i, '');
    if (!/^[a-f0-9]{64}$/i.test(candidate)) {
      return false;
    }

    const candidateBuffer = Buffer.from(candidate, 'hex');
    const expectedBuffer = Buffer.from(expectedHex, 'hex');
    return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
  }

  private async findOrCreatePaymentFromWebhook(
    input: z.infer<typeof webhookSchema>,
    providerKey: string,
    provider: PlatformProviderConnection | null
  ) {
    const amountMinor = input.amountMinor ?? 0;
    const currency = input.currency ?? 'USD';
    const method = input.method ?? (providerKey === 'airwallex' ? 'card' : 'manual');
    const status = normalizeStatus({
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.eventType !== undefined ? { eventType: input.eventType } : {}),
      fallback: providerKey === 'airwallex' && method === 'card' ? 'processing' : 'awaiting_confirmation'
    });

    const existing = await this.paymentCoreRepository.listPayments().then((payments) =>
      (payments as any[]).find((payment) => {
        return (
          (input.externalId && payment.externalId === input.externalId) ||
          (input.transactionId && payment.transactionId === input.transactionId) ||
          (input.paymentReference && payment.paymentReference === input.paymentReference) ||
          (input.bankReference && payment.bankReference === input.bankReference)
        );
      })
    );

    if (existing) {
      return existing;
    }

    if (input.scope && (input.orderId || input.dealId)) {
      return this.paymentCoreRepository.upsertPaymentRecord({
        scope: input.scope,
        ...(input.orderId ? { orderId: input.orderId } : {}),
        ...(input.dealId ? { dealId: input.dealId } : {}),
        amountMinor,
        currency,
        method: method as PaymentMethod,
        provider: (provider?.providerType === 'airwallex' ? 'airwallex' : provider?.providerType === 'bank_transfer' ? 'internal_manual' : (providerKey === 'airwallex' ? 'airwallex' : 'internal_manual')) as PaymentProviderCode,
        status,
        externalId: input.externalId ?? null,
        transactionId: input.transactionId ?? null,
        bankReference: input.bankReference ?? null,
        paymentReference: input.paymentReference ?? null,
        metadata: {
          source: 'webhook',
          providerKey,
          eventType: input.eventType ?? null,
          payload: input.payload ?? null
        } as Prisma.InputJsonValue
      });
    }

    throw new NotFoundException('No matching payment record was found for this webhook event.');
  }

  private resolveWebhookStatus(input: z.infer<typeof webhookSchema>, fallback: PaymentRecordStatus) {
    return normalizeStatus({
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.eventType !== undefined ? { eventType: input.eventType } : {}),
      fallback
    });
  }

  private async recordAudit(
    eventType: string,
    payment: any,
    auditContext: RequestAuditContext,
    payload: Record<string, unknown>
  ) {
    await this.auditService.record({
      module: 'payment-ops',
      eventType,
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'payment-record',
      subjectId: payment.id,
      payload: {
        paymentId: payment.id,
        scope: payment.scope,
        status: payment.status,
        ...payload
      }
    });
  }

  private async emitPaymentNotification(
    payment: any,
    type: string,
    title: string,
    message: string
  ) {
    const recipients = await this.resolvePaymentRecipients(payment);

    if (!recipients.length) {
      return;
    }

    await this.notificationService.emitMany(recipients, {
      type,
      title,
      message,
      entityType: payment.scope === 'deal' ? 'deal' : 'order',
      entityId: payment.dealId ?? payment.orderId ?? payment.id,
      metadata: {
        paymentId: payment.id,
        scope: payment.scope,
        status: payment.status,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        orderId: payment.orderId ?? null,
        dealId: payment.dealId ?? null
      }
    });
  }

  private async resolvePaymentRecipients(payment: any) {
    if (payment.scope === 'deal' && payment.deal) {
      return [payment.deal.buyerUserId, payment.deal.supplierUserId].filter((value): value is string => Boolean(value));
    }

    if (payment.scope === 'order' && payment.orderId) {
      const order = await this.prismaService.client.retailOrder.findUnique({
        where: { id: payment.orderId },
        select: {
          buyerProfile: { select: { userId: true } },
          supplierProfile: { select: { userId: true } }
        }
      });

      if (!order) {
        return [];
      }

      return [order.buyerProfile?.userId, order.supplierProfile?.userId].filter((value): value is string => Boolean(value));
    }

    return [];
  }

  private ensureAdmin(authContext: AuthContext) {
    if (!this.resourceAccessService.isPlatformAdmin(authContext)) {
      throw new ForbiddenException('Admin access is required.');
    }
  }
}
