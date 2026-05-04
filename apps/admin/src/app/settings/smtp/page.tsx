import { getAdminDashboardData } from '../../../lib/api';
import { requireAccessToken } from '../../../lib/auth';
import { SmtpSettingsClient } from './smtp-settings-client';

export const dynamic = 'force-dynamic';

const internalBaseUrl = process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

async function fetchJsonOrDefault<T>(path: string, accessToken: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${internalBaseUrl}${path}`, {
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      return fallback;
    }

    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

const defaultEmailSetting = {
  enabled: false,
  provider: 'smtp',
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpSecure: false,
  fromName: 'Alemhub Marketplace',
  fromEmail: 'noreply@alemhub.sbs',
  replyToEmail: 'support@alemhub.sbs',
  supportEmail: 'support@alemhub.sbs',
  supportPhone: '',
  notes: null,
  lastAttemptAt: null,
  lastAttemptStatus: null,
  lastAttemptTransport: null,
  lastAttemptRecipient: null,
  lastAttemptEventType: null,
  lastAttemptError: null
};

export default async function SmtpSettingsPage() {
  const dashboard = await getAdminDashboardData();
  const accessToken = await requireAccessToken('/settings/smtp');

  const rawSetting = dashboard.emailSetting
    ?? (await fetchJsonOrDefault<{ value: unknown }>('/api/admin/settings/email:default', accessToken, { value: null })).value;

  const current = ((rawSetting ?? defaultEmailSetting) as {
    enabled?: boolean;
    provider?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpSecure?: boolean;
    fromName?: string;
    fromEmail?: string;
    replyToEmail?: string;
    supportEmail?: string;
    supportPhone?: string;
    notes?: string | null;
    lastAttemptAt?: string | null;
    lastAttemptStatus?: string | null;
    lastAttemptTransport?: string | null;
    lastAttemptRecipient?: string | null;
    lastAttemptEventType?: string | null;
    lastAttemptError?: string | null;
  });

  return (
    <section style={{ display: 'grid', gap: 20 }}>
      <header style={{ display: 'grid', gap: 8 }}>
        <h1 style={{ margin: 0 }}>SMTP Settings</h1>
        <p style={{ margin: 0 }}>Configure outbound email and test delivery safely from the admin control plane.</p>
        <nav style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href="/admin">Back to dashboard</a>
          <a href="/admin/partners">Partners</a>
        </nav>
      </header>

      <SmtpSettingsClient current={current} />
    </section>
  );
}
