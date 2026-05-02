import type { Prisma } from '@prisma/client';

export const adminSettingKeys = {
  airwallexProvider: 'payment-provider:airwallex',
  internalManualProvider: 'payment-provider:internal_manual',
  bankTransferProvider: 'payment-provider:bank_transfer',
  bankReceiving: 'bank-receiving:primary',
  platformReceiving: 'platform-receiving:default',
  manualPayment: 'manual-payment:default',
  compliance: 'compliance:default',
  kycDocumentRequirements: 'kyc:document-requirements',
  email: 'email:default',
  paymentRouting: 'payment-routing:default',
  governanceAuth: 'governance:auth',
  publicBranding: 'public:branding',
  publicSocialLinks: 'public:social-links',
  publicContacts: 'public:contact-settings',
  legalDocuments: 'legal:documents',
  aiContentAssistant: 'ai:content-assistant'
} as const;

export const defaultAdminSettings = [
  {
    key: adminSettingKeys.airwallexProvider,
    section: 'payment-providers',
    value: {
      providerName: 'Airwallex',
      providerType: 'airwallex',
      enabled: false,
      mode: 'test',
      publicKey: '',
      secretKey: '',
      webhookSecret: '',
      merchantId: '',
      terminalId: '',
      accountId: '',
      clientId: '',
      clientSecret: '',
      apiBaseUrl: 'https://api.airwallex.com',
      callbackUrl: '/api/payments/webhooks/airwallex',
      returnUrl: '/orders',
      statusEndpoint: 'https://api.airwallex.com/status',
      notes: 'Enable live credentials from admin settings when ready.'
    }
  },
  {
    key: adminSettingKeys.internalManualProvider,
    section: 'payment-providers',
    value: {
      providerName: 'Internal Manual',
      providerType: 'internal_manual',
      enabled: true,
      mode: 'test',
      publicKey: '',
      secretKey: '',
      webhookSecret: '',
      merchantId: '',
      terminalId: '',
      accountId: '',
      clientId: '',
      clientSecret: '',
      apiBaseUrl: '',
      callbackUrl: '',
      returnUrl: '/orders',
      statusEndpoint: '',
      notes: 'Fallback provider for manual confirmation and reconciliation.'
    }
  },
  {
    key: adminSettingKeys.bankTransferProvider,
    section: 'payment-providers',
    value: {
      providerName: 'Bank Transfer',
      providerType: 'bank_transfer',
      enabled: true,
      mode: 'test',
      publicKey: '',
      secretKey: '',
      webhookSecret: '',
      merchantId: '',
      terminalId: '',
      accountId: '',
      clientId: '',
      clientSecret: '',
      apiBaseUrl: '',
      callbackUrl: '/api/payments/webhooks/bank_transfer',
      returnUrl: '/orders',
      statusEndpoint: '',
      notes: 'Used for SWIFT / IBAN / standard bank transfer instructions.'
    }
  },
  {
    key: adminSettingKeys.bankReceiving,
    section: 'bank-receiving',
    value: {
      beneficiaryName: 'Alemhub Corp',
      legalEntityName: 'Alemhub Corp',
      bankName: 'Settlement Bank (configure in admin)',
      bankAddress: '',
      accountNumber: '',
      iban: '',
      swiftBic: '',
      routingNumber: '',
      branchCode: '',
      intermediaryBank: '',
      paymentReferencePrefix: 'AH',
      invoicePrefix: 'AH',
      supportEmail: 'support@alemhub.sbs',
      supportPhone: '+1 737 237 0456'
    }
  },
  {
    key: adminSettingKeys.platformReceiving,
    section: 'platform-receiving',
    value: {
      platformLegalName: 'Alemhub Corp',
      platformAddress: 'Alemhub Corp, USA & Kazakhstan (AIFC)',
      platformRegistrationNumber: '',
      taxVatNumber: '',
      invoicingEmail: 'billing@alemhub.sbs',
      defaultCurrency: 'USD',
      invoiceFooter: 'Thank you for trading on Alemhub Marketplace.',
      paymentInstructionsText: 'Use the invoice reference exactly as shown to speed up reconciliation.',
      complianceDisclaimerText: 'Commercial terms may be subject to platform compliance review.'
    }
  },
  {
    key: adminSettingKeys.manualPayment,
    section: 'manual-payment',
    value: {
      enabled: true,
      paymentProofRequired: true,
      instructionsText: 'Upload proof of payment or send the transfer reference to billing for review.',
      whoConfirmsPayments: 'admin',
      proofRequiredFields: ['paymentReference', 'proofImage'],
      reviewQueueLabel: 'Manual payment review',
      bankTransferInstructions: 'Manual payments are verified against bank receipts and references.'
    }
  },
  {
    key: adminSettingKeys.compliance,
    section: 'compliance',
    value: {
      legalDisclaimer:
        'Invoice and payment instructions are provided for settlement purposes and may require compliance review before release.',
      termsSnippet: 'All payments follow the agreed commercial terms and platform policies.',
      refundPaymentNote: 'Refunds, if applicable, are issued back to the original settlement rail where possible.',
      complianceStatement: 'Funds are released only after verification and role-appropriate approval.',
      signatureNameTitle: 'Authorized Signatory',
      signatureImageUrl: '',
      companySealImageUrl: ''
    }
  },
  {
    key: adminSettingKeys.kycDocumentRequirements,
    section: 'compliance',
    value: {
      requirements: [
        {
          id: 'buyer-b2b-company-registration',
          code: 'buyer_b2b_company_registration',
          name: 'Company registration document',
          appliesTo: ['buyer_b2b'],
          required: true,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          helpText: 'Upload a recent company registration extract or certificate.',
          active: true
        },
        {
          id: 'buyer-b2b-proof-address',
          code: 'buyer_b2b_proof_of_address',
          name: 'Proof of company address',
          appliesTo: ['buyer_b2b'],
          required: true,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          helpText: 'Provide a utility bill, tax letter, or registry extract showing the legal address.',
          active: true
        },
        {
          id: 'supplier-company-registration',
          code: 'supplier_company_registration',
          name: 'Supplier company registration',
          appliesTo: ['supplier'],
          required: true,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          helpText: 'Upload the supplier business registration document.',
          active: true
        },
        {
          id: 'logistics-company-registration',
          code: 'logistics_company_registration',
          name: 'Logistics company registration',
          appliesTo: ['logistics'],
          required: true,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          helpText: 'Upload the logistics company registration or license.',
          active: true
        },
        {
          id: 'customs-broker-license',
          code: 'customs_broker_license',
          name: 'Customs broker license',
          appliesTo: ['customs'],
          required: true,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          helpText: 'Upload a valid customs broker license or registration.',
          active: true
        }
      ]
    }
  },
  {
    key: adminSettingKeys.email,
    section: 'email',
    value: {
      enabled: false,
      provider: 'smtp',
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      smtpSecure: false,
      fromName: 'Alemhub Marketplace',
      fromEmail: 'noreply@alemhub.sbs',
      replyToEmail: 'support@alemhub.sbs',
      supportEmail: 'support@alemhub.sbs',
      supportPhone: '+1 737 237 0456',
      notes: 'Configure SMTP credentials before enabling outbound email.',
      lastAttemptAt: null,
      lastAttemptStatus: null,
      lastAttemptTransport: null,
      lastAttemptRecipient: null,
      lastAttemptEventType: null,
      lastAttemptError: null
    }
  },
  {
    key: adminSettingKeys.aiContentAssistant,
    section: 'ai',
    value: {
      enabled: false,
      provider: 'openai',
      model: 'gpt-5.2',
      apiBaseUrl: 'https://api.openai.com/v1/responses',
      apiKey: '',
      translationLanguages: ['en', 'ru', 'kk', 'tr', 'zh-CN'],
      notes: 'Supplier-side product copy assistant. Suggestions never overwrite form fields until the user applies them.'
    }
  },
  {
    key: adminSettingKeys.paymentRouting,
    section: 'payment-routing',
    value: {
      card: 'airwallex',
      qr: 'airwallex',
      bank_transfer: 'internal_manual',
      swift: 'internal_manual',
      iban_invoice: 'internal_manual',
      manual: 'internal_manual'
    }
  },
  {
    key: adminSettingKeys.governanceAuth,
    section: 'governance',
    value: {
      emailVerificationRequired: false,
      registrationDocumentSlugs: ['terms', 'privacy'],
      supplierRegistrationDocumentSlugs: ['terms', 'privacy', 'seller-policy'],
      checkoutDocumentSlugs: ['terms', 'privacy'],
      dealFundingDocumentSlugs: ['terms', 'privacy']
    }
  },
  {
    key: adminSettingKeys.publicBranding,
    section: 'public',
    value: {
      siteName: 'Alemhub',
      logoUrl: '',
      logoAlt: 'Alemhub logo',
      markText: 'AH'
    }
  },
  {
    key: adminSettingKeys.publicSocialLinks,
    section: 'public',
    value: {
      items: [
        {
          id: 'linkedin',
          name: 'LinkedIn',
          url: 'https://www.linkedin.com',
          icon: 'in',
          logoUrl: '',
          active: true,
          displayOrder: 1
        },
        {
          id: 'x',
          name: 'X',
          url: 'https://x.com',
          icon: 'X',
          logoUrl: '',
          active: true,
          displayOrder: 2
        }
      ]
    }
  },
  {
    key: adminSettingKeys.publicContacts,
    section: 'public',
    value: {
      addresses: [
        {
          id: 'hq',
          label: 'Head office',
          value: 'Alemhub Corp, USA & Kazakhstan (AIFC)',
          active: true,
          displayOrder: 1
        }
      ],
      phones: [
        {
          id: 'support',
          label: 'Support',
          value: '+1 737 237 0456',
          active: true,
          displayOrder: 1
        }
      ]
    }
  },
  {
    key: adminSettingKeys.legalDocuments,
    section: 'legal',
    value: {
      documents: [
        {
          slug: 'terms',
          title: 'Terms & Conditions',
          footerLabel: 'Terms & Conditions',
          summary: 'Marketplace access, order terms, escrow rules, and dispute handling.',
          content:
            'These Terms & Conditions govern access to the Alemhub marketplace, supplier listings, buyer orders, RFQ activity, escrow-backed settlements, dispute handling, and role-based obligations.',
          version: '2026.04',
          active: true,
          showInFooter: true
        },
        {
          slug: 'returns',
          title: 'Return Policy',
          footerLabel: 'Return Policy',
          summary: 'Return eligibility, inspection windows, and refund handling.',
          content:
            'The Return Policy defines inspection periods, non-returnable categories, supplier obligations, buyer rejection windows, and how approved refunds are processed through the marketplace and escrow flows.',
          version: '2026.04',
          active: true,
          showInFooter: true
        },
        {
          slug: 'support-policy',
          title: 'Support Policy',
          footerLabel: 'Support Policy',
          summary: 'Response windows, escalation paths, and support channel coverage.',
          content:
            'The Support Policy covers platform support channels, critical issue triage, onboarding support, payment review coordination, and escalation timelines for active commercial transactions.',
          version: '2026.04',
          active: true,
          showInFooter: true
        },
        {
          slug: 'privacy',
          title: 'Privacy Policy',
          footerLabel: 'Privacy Policy',
          summary: 'Data processing, KYC/KYB records, cookies, and communication preferences.',
          content:
            'The Privacy Policy explains how Alemhub processes account data, KYC/KYB records, order and deal metadata, payment references, communication preferences, and operational logs.',
          version: '2026.04',
          active: true,
          showInFooter: true
        },
        {
          slug: 'seller-policy',
          title: 'Seller Policy',
          footerLabel: 'Seller Policy',
          summary: 'Supplier obligations, listing quality, payout readiness, and settlement compliance.',
          content:
            'The Seller Policy defines supplier conduct, product accuracy standards, shipping readiness, payout account verification, compliance obligations, and seller-side dispute responsibilities.',
          version: '2026.04',
          active: true,
          showInFooter: true
        }
      ]
    }
  }
] satisfies Array<{
  key: string;
  section: string;
  value: Prisma.InputJsonValue;
}>;

export type AdminSettingRow = {
  id: string;
  key: string;
  section: string;
  value: Prisma.JsonValue;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminSettingValue = Record<string, unknown>;

export function isPlainObject(value: unknown): value is AdminSettingValue {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeValue(existing: unknown, patch: unknown): unknown {
  if (patch === undefined) {
    return existing;
  }

  if (Array.isArray(patch)) {
    return patch;
  }

  if (isPlainObject(existing) && isPlainObject(patch)) {
    const next: AdminSettingValue = { ...existing };

    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) {
        continue;
      }

      next[key] = mergeValue(existing[key], value);
    }

    return next;
  }

  return patch;
}

export function mergeAdminSettingValue(existing: Prisma.JsonValue | null | undefined, patch: Prisma.InputJsonValue) {
  return mergeValue(existing, patch) as Prisma.InputJsonValue;
}

function maskSensitiveFields(value: unknown, secretKeys: string[]) {
  if (!isPlainObject(value)) {
    return value;
  }

  const next: AdminSettingValue = { ...value };
  for (const key of secretKeys) {
    if (key in next && next[key] !== null && next[key] !== undefined && next[key] !== '') {
      next[key] = null;
    }
  }

  return next;
}

export function sanitizeAdminSettingRow(row: AdminSettingRow): AdminSettingRow {
  const secretKeys =
    row.key === adminSettingKeys.email
      ? ['smtpPassword']
      : row.key === adminSettingKeys.aiContentAssistant
        ? ['apiKey']
      : row.key.startsWith('payment-provider:')
        ? ['secretKey', 'webhookSecret', 'clientSecret']
        : [];

  return {
    ...row,
    value: maskSensitiveFields(row.value, secretKeys) as Prisma.JsonValue
  };
}

export function getSettingValue(rows: AdminSettingRow[], key: string) {
  const row = rows.find((entry) => entry.key === key);
  return row?.value ?? null;
}

export function getString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

export function getBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

export function getNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
