import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { AuthContext, RequestAuditContext } from '../../app/auth-context.js';
import { ResourceAccessService } from '../../app/resource-access.service.js';
import { PrismaService } from '../../app/prisma.service.js';
import { AuditService } from '../audit-observability/audit.service.js';
import { EmailService } from '../notifications-core/email.service.js';
import {
  adminSettingKeys,
  defaultAdminSettings,
  getBoolean,
  getNumber,
  getSettingValue,
  getString,
  isPlainObject,
  mergeAdminSettingValue,
  sanitizeAdminSettingRow,
  type AdminSettingRow
} from './admin-ops.defaults.js';
import { AdminOpsRepository } from './admin-ops.repository.js';

const upsertSettingSchema = z.object({
  section: z.string().min(1).max(120),
  value: z.any()
});

const listNotificationsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25)
});

const testEmailSchema = z.object({
  recipientEmail: z.string().email(),
  subject: z.string().min(1).max(120).optional(),
  message: z.string().min(1).max(1000).optional()
});

const invoiceKindSchema = z.enum(['deal', 'order']);

type PaymentMethod = 'card' | 'qr' | 'bank_transfer' | 'swift' | 'iban_invoice' | 'manual';
type PaymentProvider = 'internal_manual' | 'airwallex' | 'bank_transfer' | 'none';

type PaymentRecordLike = {
  id: string;
  scope: 'order' | 'deal';
  amountMinor: number;
  currency: string;
  method: PaymentMethod;
  provider: PaymentProvider;
  status: string;
  externalId: string | null;
  transactionId: string | null;
  bankReference: string | null;
  paymentReference: string | null;
  instructions: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  attempts: Array<{
    id: string;
    attemptType: string;
    method: PaymentMethod;
    provider: PaymentProvider;
    status: string;
    amountMinor: number;
    currency: string;
    externalId: string | null;
    transactionId: string | null;
    bankReference: string | null;
    paymentReference: string | null;
    note: string | null;
    payload: Prisma.JsonValue | null;
    createdAt: Date;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value);
}

function formatMoney(amountMinor: number, currency: string) {
  return `${currency} ${(amountMinor / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function formatPersonName(firstName?: string | null, lastName?: string | null, fallback?: string | null) {
  const name = [firstName, lastName].filter((part) => typeof part === 'string' && part.length > 0).join(' ').trim();
  return name || fallback || 'Unknown';
}

function invoiceNumberFromId(id: string) {
  return `INV-${id.slice(0, 8).toUpperCase()}`;
}

function dueDateFromCreatedAt(createdAt: Date, days = 7) {
  const date = new Date(createdAt);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function cleanStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
}

function providerReadyState(connection: Record<string, unknown> | null | undefined) {
  if (!connection) {
    return {
      status: 'missing',
      isReady: false
    };
  }

  const enabled = getBoolean(connection.enabled, false);
  const providerType = getString(connection.providerType, 'unknown');
  const hasCredentials =
    providerType === 'airwallex'
      ? Boolean(getString(connection.secretKey, '') || getString(connection.clientSecret, ''))
      : providerType === 'internal_manual'
        ? true
        : Boolean(getString(connection.accountId, '') || getString(connection.secretKey, ''));

  if (!enabled) {
    return {
      status: 'disabled',
      isReady: false
    };
  }

  if (!hasCredentials && providerType === 'airwallex') {
    return {
      status: 'fallback',
      isReady: false
    };
  }

  return {
    status: 'ready',
    isReady: true
  };
}

function maskProviderConnection(value: Record<string, unknown> | null | undefined) {
  if (!value) {
    return null;
  }

  return {
    ...value,
    secretKey: value.secretKey ? null : null,
    webhookSecret: value.webhookSecret ? null : null,
    clientSecret: value.clientSecret ? null : null
  };
}

function asInvoiceInstructionRows(payment?: PaymentRecordLike | null, settings?: PlatformInvoiceSettings) {
  const rows: Array<{ label: string; value: string }> = [];

  if (payment?.paymentReference) {
    rows.push({ label: 'Payment reference', value: payment.paymentReference });
  }

  if (payment?.transactionId) {
    rows.push({ label: 'Transaction ID', value: payment.transactionId });
  }

  if (payment?.bankReference) {
    rows.push({ label: 'Bank reference', value: payment.bankReference });
  }

  if (settings?.beneficiaryName) {
    rows.push({ label: 'Beneficiary', value: settings.beneficiaryName });
  }

  if (settings?.bankName) {
    rows.push({ label: 'Bank', value: settings.bankName });
  }

  if (settings?.iban) {
    rows.push({ label: 'IBAN', value: settings.iban });
  }

  if (settings?.swiftBic) {
    rows.push({ label: 'SWIFT/BIC', value: settings.swiftBic });
  }

  if (settings?.accountNumber) {
    rows.push({ label: 'Account number', value: settings.accountNumber });
  }

  if (settings?.paymentReferencePrefix && payment?.paymentReference) {
    rows.push({ label: 'Reference prefix', value: settings.paymentReferencePrefix });
  }

  return rows;
}

type PlatformInvoiceSettings = {
  platformLegalName: string;
  platformAddress: string;
  platformRegistrationNumber: string;
  taxVatNumber: string;
  invoicingEmail: string;
  defaultCurrency: string;
  invoiceFooter: string;
  paymentInstructionsText: string;
  complianceDisclaimerText: string;
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
  legalDisclaimer: string;
  termsSnippet: string;
  refundPaymentNote: string;
  complianceStatement: string;
  signatureNameTitle: string;
  signatureImageUrl: string;
  companySealImageUrl: string;
};

@Injectable()
export class AdminOpsService {
  constructor(
    @Inject(AdminOpsRepository) private readonly adminOpsRepository: AdminOpsRepository,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(EmailService) private readonly emailService: EmailService,
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(ResourceAccessService) private readonly resourceAccessService: ResourceAccessService
  ) {}

  async listSettings(authContext: AuthContext) {
    this.ensureAdmin(authContext);
    await this.ensureDefaults();
    const rows = await this.adminOpsRepository.listSettings();
    return rows.map((row) => sanitizeAdminSettingRow(row as AdminSettingRow));
  }

  async getSetting(key: string, authContext: AuthContext) {
    this.ensureAdmin(authContext);
    await this.ensureDefaults();
    const row = await this.adminOpsRepository.getSetting(key);

    if (!row) {
      throw new NotFoundException(`Setting ${key} was not found.`);
    }

    return sanitizeAdminSettingRow(row as AdminSettingRow);
  }

  async upsertSetting(key: string, input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    this.ensureAdmin(authContext);
    await this.ensureDefaults();
    const parsed = upsertSettingSchema.parse(input);
    const existing = await this.adminOpsRepository.getSetting(key);
    const mergedValue = mergeAdminSettingValue(existing?.value ?? null, parsed.value);

    const saved = await this.adminOpsRepository.upsertSetting({
      key,
      section: parsed.section,
      value: mergedValue,
      updatedByUserId: auditContext.actorId
    });

    await this.auditService.record({
      module: 'admin-ops',
      eventType: 'admin.setting.updated',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'admin-setting',
      subjectId: saved.id,
      payload: {
        key: saved.key,
        section: saved.section
      }
    });

    return sanitizeAdminSettingRow(saved as AdminSettingRow);
  }

  async getPaymentConfig(authContext: AuthContext) {
    this.ensureAuthenticated(authContext);
    const rows = await this.loadSettings();
    const settings = this.buildSettingsDocument(rows);
    const providerConnections = Object.entries(settings.paymentProviders).map(([providerKey, value]) => ({
      key: providerKey,
      ...(maskProviderConnection(value) ?? {}),
      ...providerReadyState(value)
    }));

    return {
      providers: providerConnections,
      bank: settings.bankReceiving,
      platform: settings.platformReceiving,
      compliance: settings.compliance,
      manualPayment: settings.manualPayment,
      email: settings.email,
      routing: settings.paymentRouting,
      readiness: {
        card: providerReadyState(settings.paymentProviders.airwallex).isReady,
        qr: providerReadyState(settings.paymentProviders.airwallex).isReady,
        bank_transfer: providerReadyState(settings.paymentProviders.bank_transfer).isReady,
        swift: providerReadyState(settings.paymentProviders.bank_transfer).isReady,
        iban_invoice: providerReadyState(settings.paymentProviders.bank_transfer).isReady,
        manual: providerReadyState(settings.paymentProviders.internal_manual).isReady
      },
      fallback: {
        card: providerReadyState(settings.paymentProviders.airwallex).status !== 'ready',
        bankTransfer: providerReadyState(settings.paymentProviders.bank_transfer).status !== 'ready',
        manual: providerReadyState(settings.paymentProviders.internal_manual).status !== 'ready'
      }
    };
  }

  async getInvoiceContext(kind: string, id: string, authContext: AuthContext) {
    this.ensureAuthenticated(authContext);
    const parsedKind = invoiceKindSchema.parse(kind);
    const rows = await this.loadSettings();
    const settings = this.buildSettingsDocument(rows);

    if (parsedKind === 'deal') {
      return this.buildDealInvoiceContext(id, authContext, settings);
    }

    return this.buildOrderReceiptContext(id, authContext, settings);
  }

  async listNotifications(query: unknown, authContext: AuthContext) {
    this.ensureAuthenticated(authContext);
    const { limit } = listNotificationsSchema.parse(query);
    const events = await this.prismaService.client.auditEvent.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: Math.min(limit, 100)
    });

    const accessibleTenantIds = this.resourceAccessService.getAccessibleTenantIds(authContext);

    const filtered = events.filter((event) => {
      if (this.resourceAccessService.isPlatformAdmin(authContext)) {
        return true;
      }

      if (event.actorId && authContext.internalUserId && event.actorId === authContext.internalUserId) {
        return true;
      }

      if (event.tenantId && accessibleTenantIds?.includes(event.tenantId)) {
        return true;
      }

      return false;
    });

    return {
      items: filtered.map((event) => this.mapNotification(event))
    };
  }

  async testEmail(input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    this.ensureAdmin(authContext);
    const parsed = testEmailSchema.parse(input);
    const result = await this.emailService.sendEmail('smtp.test', {
      id: parsed.recipientEmail,
      email: parsed.recipientEmail,
      name: parsed.recipientEmail
    }, {
      subject: parsed.subject ?? 'RuFlo SMTP test',
      title: 'SMTP configuration test',
      message: parsed.message ?? 'This is a test email sent from the RuFlo admin panel.'
    });

    await this.auditService.record({
      module: 'admin-ops',
      eventType: result.sent ? 'admin.smtp.test.sent' : 'admin.smtp.test.failed',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'admin-setting',
      subjectId: adminSettingKeys.email,
        payload: {
          recipientEmail: parsed.recipientEmail,
          result
        }
      });

    return {
      success: Boolean(result.sent),
      error: result.sent ? null : result.reason ?? 'smtp_delivery_failed',
      transport: result.transport,
      recipientEmail: parsed.recipientEmail,
      details: result
    };
  }

  private async buildDealInvoiceContext(id: string, authContext: AuthContext, settings: ReturnType<AdminOpsService['buildSettingsDocument']>) {
    const accessibleTenantIds = this.resourceAccessService.getAccessibleTenantIds(authContext);
    const canReadAllPaymentDocs =
      this.resourceAccessService.isPlatformAdmin(authContext) ||
      authContext.permissions.some((permission) =>
        ['admin.access', 'approval.read', 'approval.manage', 'document.read', 'document.manage'].includes(permission)
      );
    const contractDeal: any = this.resourceAccessService.isPlatformAdmin(authContext) || canReadAllPaymentDocs
      ? await this.prismaService.client.contractRfqDeal.findUnique({
          where: { id },
          include: {
            rfq: true,
            quote: true,
            paymentRecords: {
              orderBy: {
                createdAt: 'desc'
              },
              include: {
                attempts: {
                  orderBy: {
                    createdAt: 'asc'
                  }
                }
              }
            }
          }
        })
      : await this.prismaService.client.contractRfqDeal.findFirst({
          where: {
            id,
            ...(authContext.internalUserId
              ? { OR: [{ buyerUserId: authContext.internalUserId }, { supplierUserId: authContext.internalUserId }] }
              : {})
          },
          include: {
            rfq: true,
            quote: true,
            paymentRecords: {
              orderBy: {
                createdAt: 'desc'
              },
              include: {
                attempts: {
                  orderBy: {
                    createdAt: 'asc'
                  }
                }
              }
            }
          }
        });

    if (contractDeal) {
      return this.buildContractDealInvoiceContext(contractDeal, authContext, settings);
    }

    const wholesaleDeal: any = this.resourceAccessService.isPlatformAdmin(authContext)
    || canReadAllPaymentDocs
      ? await this.prismaService.client.wholesaleDeal.findUnique({
          where: { id },
          include: {
            rfq: {
              include: {
                tenant: true,
                buyerProfile: true,
                quotes: {
                  include: {
                    sellerProfile: true
                  },
                  orderBy: {
                    createdAt: 'asc'
                  }
                }
              }
            },
            acceptedQuote: {
              include: {
                sellerProfile: true
              }
            },
            tenant: true,
            buyerProfile: true,
            sellerProfile: true,
            dealRoom: true,
            contract: {
              include: {
                versions: {
                  orderBy: {
                    versionNumber: 'desc'
                  }
                }
              }
            },
            documentLinks: {
              include: {
                document: true
              },
              orderBy: {
                createdAt: 'desc'
              }
            },
            paymentTransactions: {
              orderBy: {
                createdAt: 'desc'
              },
              include: {
                ledgerEntries: {
                  orderBy: {
                    createdAt: 'asc'
                  }
                }
              }
            }
          }
        })
      : await this.prismaService.client.wholesaleDeal.findFirst({
          where: {
            id,
            ...(accessibleTenantIds ? { tenantId: { in: accessibleTenantIds } } : {}),
            ...(authContext.internalUserId
              ? {
                  OR: [
                    { buyerProfile: { userId: authContext.internalUserId } },
                    { sellerProfile: { userId: authContext.internalUserId } }
                  ]
                }
              : {})
          },
          include: {
            rfq: {
              include: {
                tenant: true,
                buyerProfile: true,
                quotes: {
                  include: {
                    sellerProfile: true
                  },
                  orderBy: {
                    createdAt: 'asc'
                  }
                }
              }
            },
            acceptedQuote: {
              include: {
                sellerProfile: true
              }
            },
            tenant: true,
            buyerProfile: true,
            sellerProfile: true,
            dealRoom: true,
            contract: {
              include: {
                versions: {
                  orderBy: {
                    versionNumber: 'desc'
                  }
                }
              }
            },
            documentLinks: {
              include: {
                document: true
              },
              orderBy: {
                createdAt: 'desc'
              }
            },
            paymentTransactions: {
              orderBy: {
                createdAt: 'desc'
              },
              include: {
                ledgerEntries: {
                  orderBy: {
                    createdAt: 'asc'
                  }
                }
              }
            }
          }
        });

    if (!wholesaleDeal) {
      throw new NotFoundException(`Deal ${id} was not found.`);
    }

    return this.buildWholesaleDealInvoiceContext(wholesaleDeal, authContext, settings);
  }

  private async buildContractDealInvoiceContext(
    deal: any,
    authContext: AuthContext,
    settings: ReturnType<AdminOpsService['buildSettingsDocument']>
  ) {
    const [buyerUser, supplierUser, buyerProfile, supplierProfile] = await Promise.all([
      deal.buyerUserId
        ? this.prismaService.client.user.findUnique({
            where: { id: deal.buyerUserId },
            select: { id: true, email: true, firstName: true, lastName: true }
          })
        : Promise.resolve(null),
      deal.supplierUserId
        ? this.prismaService.client.user.findUnique({
            where: { id: deal.supplierUserId },
            select: { id: true, email: true, firstName: true, lastName: true }
          })
        : Promise.resolve(null),
      deal.buyerUserId
        ? this.prismaService.client.buyerProfile.findFirst({
            where: { userId: deal.buyerUserId },
            select: {
              id: true,
              displayName: true,
              tenant: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
            }
          })
        : Promise.resolve(null),
      deal.supplierUserId
        ? this.prismaService.client.sellerProfile.findFirst({
            where: { userId: deal.supplierUserId },
            select: {
              id: true,
              displayName: true,
              tenant: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
            }
          })
        : Promise.resolve(null)
    ]);

    const payment = deal.paymentRecords[0] ?? null;
    const invoiceNumber =
      (isRecord(payment?.instructions) && typeof payment?.instructions.invoiceNumber === 'string' && payment.instructions.invoiceNumber) ||
      payment?.paymentReference ||
      invoiceNumberFromId(deal.id);
    const currency = payment?.currency ?? deal.quote?.currency ?? settings.platformReceiving.defaultCurrency;
    const amountMinor = payment?.amountMinor ?? deal.quote?.totalPrice ?? 0;
    const dueDate = payment ? dueDateFromCreatedAt(payment.createdAt) : dueDateFromCreatedAt(deal.createdAt);
    const paymentInstructions = asInvoiceInstructionRows(payment, settings.bankReceiving);
    const timeline = await this.buildTimeline('contract-rfq-deal', deal.id, { type: 'payment-record', id: payment?.id ?? null }, authContext);

    return {
      kind: 'deal',
      id: deal.id,
      invoiceNumber,
      dueDate,
      amountMinor,
      currency,
      status: payment?.status ?? deal.dealStatus,
      paymentMethod: payment?.method ?? 'manual',
      paymentProvider: payment?.provider ?? 'internal_manual',
      transactionId: payment?.transactionId ?? null,
      paymentReference: payment?.paymentReference ?? null,
      bankReference: payment?.bankReference ?? null,
      buyer: {
        name: buyerProfile?.displayName ?? formatPersonName(buyerUser?.firstName, buyerUser?.lastName, buyerUser?.email),
        email: buyerUser?.email ?? null,
        companyName: buyerProfile?.displayName ?? null,
        tenantName: buyerProfile?.tenant?.name ?? null
      },
      supplier: {
        name: supplierProfile?.displayName ?? formatPersonName(supplierUser?.firstName, supplierUser?.lastName, supplierUser?.email),
        email: supplierUser?.email ?? null,
        companyName: supplierProfile?.displayName ?? null,
        tenantName: supplierProfile?.tenant?.name ?? null
      },
      order: null,
      deal: {
        id: deal.id,
        status: deal.dealStatus,
        buyerStatus: deal.buyerStatus,
        supplierStatus: deal.supplierStatus,
        rfqId: deal.rfqId,
        quoteId: deal.quoteId,
        createdAt: deal.createdAt.toISOString()
      },
      payment: payment
        ? {
            id: payment.id,
            scope: payment.scope,
            amountMinor: payment.amountMinor,
            currency: payment.currency,
            method: payment.method,
            provider: payment.provider,
            status: payment.status,
            externalId: payment.externalId,
            transactionId: payment.transactionId,
            bankReference: payment.bankReference,
            paymentReference: payment.paymentReference,
            instructions: payment.instructions,
            metadata: payment.metadata,
            createdAt: payment.createdAt.toISOString(),
            updatedAt: payment.updatedAt.toISOString(),
            attempts: payment.attempts.map((attempt: any) => ({
              id: attempt.id,
              attemptType: attempt.attemptType,
              method: attempt.method,
              provider: attempt.provider,
              status: attempt.status,
              amountMinor: attempt.amountMinor,
              currency: attempt.currency,
              externalId: attempt.externalId,
              transactionId: attempt.transactionId,
              bankReference: attempt.bankReference,
              paymentReference: attempt.paymentReference,
              note: attempt.note,
              payload: attempt.payload,
              createdAt: attempt.createdAt.toISOString()
            }))
          }
        : null,
      paymentInstructions,
      timeline,
      platform: {
        legalName: settings.platformReceiving.platformLegalName,
        address: settings.platformReceiving.platformAddress,
        registrationNumber: settings.platformReceiving.platformRegistrationNumber,
        taxVatNumber: settings.platformReceiving.taxVatNumber,
        invoicingEmail: settings.platformReceiving.invoicingEmail,
        defaultCurrency: settings.platformReceiving.defaultCurrency,
        invoiceFooter: settings.platformReceiving.invoiceFooter,
        paymentInstructionsText: settings.platformReceiving.paymentInstructionsText,
        complianceDisclaimerText: settings.platformReceiving.complianceDisclaimerText
      },
      bank: settings.bankReceiving,
      compliance: settings.compliance,
      signature: {
        nameTitle: settings.compliance.signatureNameTitle,
        imageUrl: settings.compliance.signatureImageUrl,
        companySealImageUrl: settings.compliance.companySealImageUrl
      },
      pdfUrl: `/invoice/${deal.id}/pdf`
    };
  }

  private async buildWholesaleDealInvoiceContext(
    deal: any,
    authContext: AuthContext,
    settings: ReturnType<AdminOpsService['buildSettingsDocument']>
  ) {
    const buyerProfile = deal.buyerProfile ?? deal.rfq?.buyerProfile ?? null;
    const sellerProfile = deal.sellerProfile ?? deal.acceptedQuote?.sellerProfile ?? null;
    const paymentTransaction = deal.paymentTransactions?.[0] ?? null;
    const agreementSnapshot = isRecord(deal.agreementSnapshot) ? deal.agreementSnapshot : null;
    const invoiceNumber =
      (isRecord(agreementSnapshot) && typeof agreementSnapshot.invoiceNumber === 'string' && agreementSnapshot.invoiceNumber) ||
      `INV-${deal.id.slice(0, 8).toUpperCase()}`;
    const currency =
      paymentTransaction?.currency ??
      deal.acceptedQuote?.currency ??
      agreementSnapshot?.currency ??
      settings.platformReceiving.defaultCurrency;
    const amountMinor =
      paymentTransaction?.totalAmountMinor ??
      deal.acceptedQuote?.amountMinor ??
      agreementSnapshot?.priceMinor ??
      0;
    const dueDate = dueDateFromCreatedAt(deal.createdAt);
    const paymentInstructions = asInvoiceInstructionRows(
      {
        id: paymentTransaction?.id ?? deal.id,
        paymentReference: invoiceNumber,
        transactionId: paymentTransaction?.id ?? null,
        bankReference: paymentTransaction?.id ?? null,
        amountMinor,
        currency,
        method: 'manual',
        provider: 'internal_manual',
        status: paymentTransaction?.status ?? 'pending',
        scope: 'deal',
        externalId: null,
        instructions: null,
        metadata: null,
        createdAt: paymentTransaction?.createdAt ?? deal.createdAt,
        updatedAt: paymentTransaction?.updatedAt ?? deal.createdAt,
        attempts: []
      },
      settings.bankReceiving
    );
    const timeline = await this.buildTimeline('wholesale-deal', deal.id, { type: 'payment-transaction', id: paymentTransaction?.id ?? null }, authContext);

    return {
      kind: 'deal',
      id: deal.id,
      invoiceNumber,
      dueDate,
      amountMinor,
      currency,
      status: paymentTransaction?.status ?? deal.status,
      paymentMethod: 'manual',
      paymentProvider: 'internal_manual',
      transactionId: paymentTransaction?.id ?? null,
      paymentReference: invoiceNumber,
      bankReference: paymentTransaction?.id ?? null,
      buyer: {
        name:
          buyerProfile?.displayName ??
          formatPersonName(buyerProfile?.user?.firstName, buyerProfile?.user?.lastName, buyerProfile?.user?.email),
        email: buyerProfile?.user?.email ?? null,
        companyName: buyerProfile?.displayName ?? null,
        tenantName: buyerProfile?.tenant?.name ?? null
      },
      supplier: {
        name:
          sellerProfile?.displayName ??
          formatPersonName(sellerProfile?.user?.firstName, sellerProfile?.user?.lastName, sellerProfile?.user?.email),
        email: sellerProfile?.user?.email ?? null,
        companyName: sellerProfile?.displayName ?? null,
        tenantName: sellerProfile?.tenant?.name ?? null
      },
      order: null,
      deal: {
        id: deal.id,
        status: deal.status,
        buyerStatus: deal.status,
        supplierStatus: deal.status,
        rfqId: deal.rfqId,
        quoteId: deal.acceptedQuoteId,
        createdAt: deal.createdAt.toISOString()
      },
      payment: paymentTransaction
        ? {
            id: paymentTransaction.id,
            scope: 'deal',
            amountMinor: paymentTransaction.totalAmountMinor,
            currency: paymentTransaction.currency,
            method: 'manual',
            provider: 'internal_manual',
            status: paymentTransaction.status,
            externalId: null,
            transactionId: paymentTransaction.id,
            bankReference: paymentTransaction.id,
            paymentReference: invoiceNumber,
            instructions: agreementSnapshot,
            metadata: agreementSnapshot,
            createdAt: paymentTransaction.createdAt.toISOString(),
            updatedAt: paymentTransaction.updatedAt.toISOString(),
            attempts: []
          }
        : null,
      paymentInstructions,
      timeline,
      platform: {
        legalName: settings.platformReceiving.platformLegalName,
        address: settings.platformReceiving.platformAddress,
        registrationNumber: settings.platformReceiving.platformRegistrationNumber,
        taxVatNumber: settings.platformReceiving.taxVatNumber,
        invoicingEmail: settings.platformReceiving.invoicingEmail,
        defaultCurrency: settings.platformReceiving.defaultCurrency,
        invoiceFooter: settings.platformReceiving.invoiceFooter,
        paymentInstructionsText: settings.platformReceiving.paymentInstructionsText,
        complianceDisclaimerText: settings.platformReceiving.complianceDisclaimerText
      },
      bank: settings.bankReceiving,
      compliance: settings.compliance,
      signature: {
        nameTitle: settings.compliance.signatureNameTitle,
        imageUrl: settings.compliance.signatureImageUrl,
        companySealImageUrl: settings.compliance.companySealImageUrl
      },
      pdfUrl: `/deals/${deal.id}/pdf`
    };
  }

  private async buildOrderReceiptContext(id: string, authContext: AuthContext, settings: ReturnType<AdminOpsService['buildSettingsDocument']>) {
    const order: any = this.resourceAccessService.isPlatformAdmin(authContext)
      ? await this.prismaService.client.retailOrder.findUnique({
          where: { id },
          include: {
            buyerProfile: {
              include: {
                user: true,
                tenant: true
              }
            },
            supplierProfile: {
              include: {
                user: true,
                tenant: true
              }
            },
            paymentRecords: {
              orderBy: {
                createdAt: 'desc'
              },
              include: {
                attempts: {
                  orderBy: {
                    createdAt: 'asc'
                  }
                }
              }
            }
          }
        })
      : await this.prismaService.client.retailOrder.findFirst({
          where: {
            id,
            ...(authContext.internalUserId
              ? {
                  buyerProfile: {
                    userId: authContext.internalUserId
                  }
                }
              : {})
          },
          include: {
            buyerProfile: {
              include: {
                user: true,
                tenant: true
              }
            },
            supplierProfile: {
              include: {
                user: true,
                tenant: true
              }
            },
            paymentRecords: {
              orderBy: {
                createdAt: 'desc'
              },
              include: {
                attempts: {
                  orderBy: {
                    createdAt: 'asc'
                  }
                }
              }
            }
          }
        });

    if (!order) {
      throw new NotFoundException(`Order ${id} was not found.`);
    }

    const payment = order.paymentRecords[0] ?? null;
    const invoiceNumber = payment?.paymentReference ?? invoiceNumberFromId(order.id);
    const dueDate = payment ? dueDateFromCreatedAt(payment.createdAt) : dueDateFromCreatedAt(order.createdAt);
    const paymentInstructions = asInvoiceInstructionRows(payment, settings.bankReceiving);
    const timeline = await this.buildTimeline('retail-order', order.id, { type: 'payment-record', id: payment?.id ?? null }, authContext);

    return {
      kind: 'order',
      id: order.id,
      invoiceNumber,
      dueDate,
      amountMinor: payment?.amountMinor ?? order.totalAmountMinor,
      currency: payment?.currency ?? order.currency,
      status: payment?.status ?? order.status,
      paymentMethod: payment?.method ?? 'manual',
      paymentProvider: payment?.provider ?? 'internal_manual',
      transactionId: payment?.transactionId ?? order.paymentTransactionId,
      paymentReference: payment?.paymentReference ?? null,
      bankReference: payment?.bankReference ?? null,
      buyer: {
        name: order.buyerProfile?.displayName ?? formatPersonName(order.buyerProfile?.user?.firstName, order.buyerProfile?.user?.lastName, order.buyerProfile?.user?.email),
        email: order.buyerProfile?.user?.email ?? null,
        companyName: order.buyerProfile?.displayName ?? null,
        tenantName: order.buyerProfile?.tenant?.name ?? null
      },
      supplier: {
        name: order.supplierProfile?.displayName ?? formatPersonName(order.supplierProfile?.user?.firstName, order.supplierProfile?.user?.lastName, order.supplierProfile?.user?.email),
        email: order.supplierProfile?.user?.email ?? null,
        companyName: order.supplierProfile?.displayName ?? null,
        tenantName: order.supplierProfile?.tenant?.name ?? null
      },
      order: {
        id: order.id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        shippingAddress: order.shippingAddress,
        createdAt: order.createdAt.toISOString()
      },
      deal: null,
      payment: payment
        ? {
            id: payment.id,
            scope: payment.scope,
            amountMinor: payment.amountMinor,
            currency: payment.currency,
            method: payment.method,
            provider: payment.provider,
            status: payment.status,
            externalId: payment.externalId,
            transactionId: payment.transactionId,
            bankReference: payment.bankReference,
            paymentReference: payment.paymentReference,
            instructions: payment.instructions,
            metadata: payment.metadata,
            createdAt: payment.createdAt.toISOString(),
            updatedAt: payment.updatedAt.toISOString(),
            attempts: payment.attempts.map((attempt: any) => ({
              id: attempt.id,
              attemptType: attempt.attemptType,
              method: attempt.method,
              provider: attempt.provider,
              status: attempt.status,
              amountMinor: attempt.amountMinor,
              currency: attempt.currency,
              externalId: attempt.externalId,
              transactionId: attempt.transactionId,
              bankReference: attempt.bankReference,
              paymentReference: attempt.paymentReference,
              note: attempt.note,
              payload: attempt.payload,
              createdAt: attempt.createdAt.toISOString()
            }))
          }
        : null,
      paymentInstructions,
      timeline,
      platform: {
        legalName: settings.platformReceiving.platformLegalName,
        address: settings.platformReceiving.platformAddress,
        registrationNumber: settings.platformReceiving.platformRegistrationNumber,
        taxVatNumber: settings.platformReceiving.taxVatNumber,
        invoicingEmail: settings.platformReceiving.invoicingEmail,
        defaultCurrency: settings.platformReceiving.defaultCurrency,
        invoiceFooter: settings.platformReceiving.invoiceFooter,
        paymentInstructionsText: settings.platformReceiving.paymentInstructionsText,
        complianceDisclaimerText: settings.platformReceiving.complianceDisclaimerText
      },
      bank: settings.bankReceiving,
      compliance: settings.compliance,
      signature: {
        nameTitle: settings.compliance.signatureNameTitle,
        imageUrl: settings.compliance.signatureImageUrl,
        companySealImageUrl: settings.compliance.companySealImageUrl
      },
      pdfUrl: `/invoice/${order.id}/pdf`
    };
  }

  private async buildTimeline(
    subjectType: string,
    subjectId: string,
    relatedSubject: { type: 'payment-record' | 'payment-transaction'; id: string | null },
    authContext: AuthContext
  ) {
    const events = await this.prismaService.client.auditEvent.findMany({
      where: {
        OR: [
          {
            subjectType,
            subjectId
          },
          ...(relatedSubject.id
            ? [
                {
                  subjectType: relatedSubject.type,
                  subjectId: relatedSubject.id
                }
              ]
            : [])
        ]
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    if (this.resourceAccessService.isPlatformAdmin(authContext)) {
      return events.map((event) => this.mapTimelineEvent(event));
    }

    const ownUserId = authContext.internalUserId ?? authContext.subject ?? null;
    return events.filter((event) => !event.actorId || event.actorId === ownUserId || event.tenantId === authContext.tenantId).map((event) => this.mapTimelineEvent(event));
  }

  private mapTimelineEvent(event: {
    id: string;
    module: string;
    eventType: string;
    actorId: string | null;
    tenantId: string | null;
    subjectType: string | null;
    subjectId: string | null;
    payload: Prisma.JsonValue;
    createdAt: Date;
  }) {
    const payload = isRecord(event.payload) ? event.payload : {};

    return {
      id: event.id,
      module: event.module,
      eventType: event.eventType,
      title: this.eventTitle(event.eventType),
      body: this.eventBody(event.eventType, payload),
      actorId: event.actorId,
      subjectType: event.subjectType,
      subjectId: event.subjectId,
      createdAt: event.createdAt.toISOString()
    };
  }

  private eventTitle(eventType: string) {
    if (eventType.includes('invoice')) {
      return 'Invoice issued';
    }
    if (eventType.includes('paid') || eventType.includes('received')) {
      return 'Payment received';
    }
    if (eventType.includes('ship')) {
      return 'Shipment updated';
    }
    if (eventType.includes('delivered') || eventType.includes('confirm')) {
      return 'Delivery confirmed';
    }
    if (eventType.includes('quote')) {
      return 'Quote updated';
    }
    if (eventType.includes('rfq')) {
      return 'RFQ updated';
    }
    return eventType;
  }

  private eventBody(eventType: string, payload: Record<string, unknown>) {
    if (eventType.includes('invoice') && typeof payload.paymentReference === 'string') {
      return `Reference ${payload.paymentReference}`;
    }

    if ((eventType.includes('paid') || eventType.includes('received')) && typeof payload.transactionId === 'string') {
      return `Transaction ${payload.transactionId}`;
    }

    if (typeof payload.status === 'string') {
      return `Status ${payload.status}`;
    }

    return 'Lifecycle update';
  }

  private buildSettingsDocument(rows: AdminSettingRow[]) {
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
      email: this.readEmail(rows),
      manualPayment: this.readManualPayment(rows),
      paymentRouting: this.readRouting(rows)
    };
  }

  private readProvider(rows: AdminSettingRow[], key: string) {
    const value = getSettingValue(rows, key);
    return {
      ...(isRecord(value) ? value : {}),
      enabled: getBoolean(isRecord(value) ? value.enabled : undefined, false),
      mode: getString(isRecord(value) ? value.mode : undefined, 'test'),
      providerName: getString(isRecord(value) ? value.providerName : undefined, key),
      providerType: getString(isRecord(value) ? value.providerType : undefined, key)
    };
  }

  private readBank(rows: AdminSettingRow[]): PlatformInvoiceSettings {
    const bank = isRecord(getSettingValue(rows, adminSettingKeys.bankReceiving))
      ? (getSettingValue(rows, adminSettingKeys.bankReceiving) as Record<string, unknown>)
      : {};

    const platform = isRecord(getSettingValue(rows, adminSettingKeys.platformReceiving))
      ? (getSettingValue(rows, adminSettingKeys.platformReceiving) as Record<string, unknown>)
      : {};

    const compliance = isRecord(getSettingValue(rows, adminSettingKeys.compliance))
      ? (getSettingValue(rows, adminSettingKeys.compliance) as Record<string, unknown>)
      : {};

    const email = isRecord(getSettingValue(rows, adminSettingKeys.email)) ? (getSettingValue(rows, adminSettingKeys.email) as Record<string, unknown>) : {};
    const manual = isRecord(getSettingValue(rows, adminSettingKeys.manualPayment))
      ? (getSettingValue(rows, adminSettingKeys.manualPayment) as Record<string, unknown>)
      : {};

    return {
      platformLegalName: getString(platform.platformLegalName, 'RuFlo Marketplace Ltd'),
      platformAddress: getString(platform.platformAddress, ''),
      platformRegistrationNumber: getString(platform.platformRegistrationNumber, ''),
      taxVatNumber: getString(platform.taxVatNumber, ''),
      invoicingEmail: getString(platform.invoicingEmail, 'billing@ruflo.local'),
      defaultCurrency: getString(platform.defaultCurrency, 'USD'),
      invoiceFooter: getString(platform.invoiceFooter, ''),
      paymentInstructionsText: getString(platform.paymentInstructionsText, ''),
      complianceDisclaimerText: getString(platform.complianceDisclaimerText, ''),
      beneficiaryName: getString(bank.beneficiaryName, getString(platform.platformLegalName, 'RuFlo Marketplace Ltd')),
      legalEntityName: getString(bank.legalEntityName, getString(platform.platformLegalName, 'RuFlo Marketplace Ltd')),
      bankName: getString(bank.bankName, ''),
      bankAddress: getString(bank.bankAddress, ''),
      accountNumber: getString(bank.accountNumber, ''),
      iban: getString(bank.iban, ''),
      swiftBic: getString(bank.swiftBic, ''),
      routingNumber: getString(bank.routingNumber, ''),
      branchCode: getString(bank.branchCode, ''),
      intermediaryBank: getString(bank.intermediaryBank, ''),
      paymentReferencePrefix: getString(bank.paymentReferencePrefix, 'RFLO'),
      invoicePrefix: getString(bank.invoicePrefix, 'INV'),
      supportEmail: getString(bank.supportEmail, getString(email.supportEmail, 'support@ruflo.local')),
      supportPhone: getString(bank.supportPhone, getString(email.supportPhone, '')),
      legalDisclaimer: getString(compliance.legalDisclaimer, ''),
      termsSnippet: getString(compliance.termsSnippet, ''),
      refundPaymentNote: getString(compliance.refundPaymentNote, ''),
      complianceStatement: getString(compliance.complianceStatement, ''),
      signatureNameTitle: getString(compliance.signatureNameTitle, 'Authorized Signatory'),
      signatureImageUrl: getString(compliance.signatureImageUrl, ''),
      companySealImageUrl: getString(compliance.companySealImageUrl, '')
    };
  }

  private readPlatform(rows: AdminSettingRow[]) {
    const platform = isRecord(getSettingValue(rows, adminSettingKeys.platformReceiving))
      ? (getSettingValue(rows, adminSettingKeys.platformReceiving) as Record<string, unknown>)
      : {};

    return {
      platformLegalName: getString(platform.platformLegalName, 'RuFlo Marketplace Ltd'),
      platformAddress: getString(platform.platformAddress, ''),
      platformRegistrationNumber: getString(platform.platformRegistrationNumber, ''),
      taxVatNumber: getString(platform.taxVatNumber, ''),
      invoicingEmail: getString(platform.invoicingEmail, 'billing@ruflo.local'),
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

  private readEmail(rows: AdminSettingRow[]) {
    const email = isRecord(getSettingValue(rows, adminSettingKeys.email))
      ? (getSettingValue(rows, adminSettingKeys.email) as Record<string, unknown>)
      : {};

    return {
      enabled: getBoolean(email.enabled, false),
      provider: getString(email.provider, 'smtp'),
      smtpHost: getString(email.smtpHost, ''),
      smtpPort: getNumber(email.smtpPort, 587),
      smtpUser: getString(email.smtpUser, ''),
      smtpPassword: null,
      fromName: getString(email.fromName, 'RuFlo Marketplace'),
      fromEmail: getString(email.fromEmail, 'noreply@ruflo.local'),
      replyToEmail: getString(email.replyToEmail, 'support@ruflo.local'),
      supportEmail: getString(email.supportEmail, 'support@ruflo.local'),
      supportPhone: getString(email.supportPhone, ''),
      notes: getString(email.notes, '')
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
      proofRequiredFields: cleanStringArray(manual.proofRequiredFields),
      reviewQueueLabel: getString(manual.reviewQueueLabel, 'Manual payment review'),
      bankTransferInstructions: getString(manual.bankTransferInstructions, '')
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

  private mapNotification(event: {
    id: string;
    module: string;
    eventType: string;
    tenantId: string | null;
    actorId: string | null;
    subjectType: string | null;
    subjectId: string | null;
    payload: Prisma.JsonValue;
    createdAt: Date;
  }) {
    const payload = isRecord(event.payload) ? event.payload : {};
    return {
      id: event.id,
      module: event.module,
      type: event.eventType,
      title: this.eventTitle(event.eventType),
      body: this.eventBody(event.eventType, payload),
      severity: event.eventType.includes('failed') || event.eventType.includes('reject') ? 'error' : 'info',
      tenantId: event.tenantId,
      actorId: event.actorId,
      subjectType: event.subjectType,
      subjectId: event.subjectId,
      createdAt: event.createdAt.toISOString()
    };
  }

  private ensureAdmin(authContext: AuthContext) {
    if (!this.resourceAccessService.isPlatformAdmin(authContext)) {
      throw new ForbiddenException('Admin access is required.');
    }
  }

  private ensureAuthenticated(authContext: AuthContext) {
    if (!authContext.isAuthenticated || !authContext.internalUserId) {
      throw new ForbiddenException('Authentication is required.');
    }
  }

  private async ensureDefaults() {
    await this.adminOpsRepository.ensureDefaultSettings(defaultAdminSettings);
  }

  private async loadSettings() {
    await this.ensureDefaults();
    return this.adminOpsRepository.listSettings();
  }
}
