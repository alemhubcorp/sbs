const internalApiBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export type PublicPlatformSettings = {
  company: {
    legalName: string;
    address: string;
    supportEmail: string;
    supportPhone: string;
  };
  governance: {
    emailVerificationRequired: boolean;
    emailVerificationBlockedReason: string | null;
    consent: {
      registrationDocumentSlugs: string[];
      supplierRegistrationDocumentSlugs: string[];
      checkoutDocumentSlugs: string[];
      dealFundingDocumentSlugs: string[];
    };
  };
  email: {
    enabled: boolean;
    smtpConfigured: boolean;
  };
  ai: {
    enabled: boolean;
    translationLanguages: string[];
  };
  socials: Array<{
    id: string;
    label: string;
    name: string;
    value: string;
    url: string;
    icon: string;
    logoUrl: string;
    active: boolean;
    displayOrder: number;
  }>;
  contacts: {
    addresses: Array<{
      id: string;
      label: string;
      value: string;
      active: boolean;
      displayOrder: number;
    }>;
    phones: Array<{
      id: string;
      label: string;
      value: string;
      active: boolean;
      displayOrder: number;
    }>;
  };
  legalDocuments: Array<{
    slug: string;
    title: string;
    footerLabel: string;
    summary: string;
    version: string;
    href: string;
    showInFooter: boolean;
  }>;
};

export type PublicLegalDocument = {
  slug: string;
  title: string;
  footerLabel: string;
  summary: string;
  content: string;
  version: string;
  active: boolean;
  showInFooter: boolean;
  href: string;
};

export async function getPublicPlatformSettings(): Promise<PublicPlatformSettings | null> {
  try {
    const response = await fetch(`${internalApiBaseUrl}/api/platform/public-settings`, { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }

    return (await response.json()) as PublicPlatformSettings;
  } catch {
    return null;
  }
}

export async function getPublicLegalDocument(slug: string): Promise<PublicLegalDocument | null> {
  try {
    const response = await fetch(`${internalApiBaseUrl}/api/platform/legal-docs/${encodeURIComponent(slug)}`, { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }

    return (await response.json()) as PublicLegalDocument;
  } catch {
    return null;
  }
}
