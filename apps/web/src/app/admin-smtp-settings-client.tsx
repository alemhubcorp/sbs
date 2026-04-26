'use client';

import { useEffect, useState } from 'react';
import styles from './core-flow.module.css';

type AuthRedirectError = Error & { name: 'AuthRedirectError' };

type EmailSetting = {
  enabled: boolean;
  provider: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpSecure: boolean;
  fromName: string;
  fromEmail: string;
  replyToEmail: string;
  supportEmail: string;
  supportPhone: string;
  notes?: string | null;
  lastAttemptAt?: string | null;
  lastAttemptStatus?: string | null;
  lastAttemptTransport?: string | null;
  lastAttemptRecipient?: string | null;
  lastAttemptEventType?: string | null;
  lastAttemptError?: string | null;
};

function redirectToSignIn() {
  if (typeof window !== 'undefined') {
    window.location.assign(`/signin?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }
}

async function adminJson<T>(path: string, init?: RequestInit) {
  const hasBody = init?.body !== undefined && init?.body !== null;
  const response = await fetch(`/api/admin/${path}`, {
    ...init,
    headers: {
      ...(hasBody ? { 'content-type': 'application/json' } : {}),
      ...(init?.headers ?? {})
    },
    cache: 'no-store'
  });

  const text = await response.text();
  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      redirectToSignIn();
      throw new Error('Authentication required');
    }

    const message =
      typeof data === 'object' && data !== null && 'message' in data && typeof (data as { message?: unknown }).message === 'string'
        ? String((data as { message: string }).message)
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export function AdminSmtpSettingsBoard() {
  const [setting, setSetting] = useState<EmailSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('ops@alemhub.com');
  const [passwordDraft, setPasswordDraft] = useState('');

  async function loadSetting() {
    setLoading(true);
    setError(null);

    try {
      const response = await adminJson<{ value: EmailSetting }>('settings/email:default');
      setSetting(response.value);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to load SMTP settings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSetting();
  }, []);

  async function save(next: EmailSetting) {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { smtpPassword, ...rest } = next;
      await adminJson('settings/email:default', {
        method: 'PUT',
        body: JSON.stringify({
          section: 'email',
          value: passwordDraft.trim().length
            ? {
                ...rest,
                smtpPassword: passwordDraft.trim()
              }
            : {
                ...rest
              }
        })
      });
      setSuccess('SMTP settings saved.');
      setPasswordDraft('');
      await loadSetting();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to save SMTP settings.');
    } finally {
      setSaving(false);
    }
  }

  async function testConfiguration() {
    setTesting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await adminJson<{ success: boolean; error?: string | null }>('settings/email/test', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: testEmail,
          subject: 'Alemhub SMTP test',
          message: 'This is a test message from the Alemhub admin settings page.'
        })
      });
      setSuccess(result.success ? 'Test email sent successfully.' : `SMTP test failed: ${result.error ?? 'unknown error'}`);
      await loadSetting();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to test SMTP.');
    } finally {
      setTesting(false);
    }
  }

  if (loading && !setting) {
    return <div className={styles.emptyState}>Loading SMTP settings...</div>;
  }

  const current = setting ?? {
    enabled: false,
    provider: 'smtp',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpSecure: false,
    fromName: 'Alemhub Marketplace',
    fromEmail: 'noreply@alemhub.com',
    replyToEmail: 'support@alemhub.com',
    supportEmail: 'support@alemhub.com',
    supportPhone: '',
    notes: null,
    lastAttemptAt: null,
    lastAttemptStatus: null,
    lastAttemptTransport: null,
    lastAttemptRecipient: null,
    lastAttemptEventType: null,
    lastAttemptError: null
  };

  function update<K extends keyof EmailSetting>(key: K, value: EmailSetting[K]) {
    setSetting((currentSetting) => ({ ...(currentSetting ?? current), [key]: value }));
  }

  return (
    <div className={styles.stack}>
      {error ? <div className={styles.errorBox}>{error}</div> : null}
      {success ? <div className={styles.successBox}>{success}</div> : null}

      <div className={styles.cardGrid}>
        <div className={styles.card}>
          <div className={styles.sectionTitle}>SMTP Settings</div>
          <div className={styles.inlineMeta}>
            <span>Status: {current.enabled && current.smtpHost ? 'configured' : 'not configured'}</span>
            <span>Provider: {current.provider}</span>
            <span>Last attempt: {current.lastAttemptStatus ?? 'none'}</span>
          </div>
          <div className={styles.fieldGrid} style={{ marginTop: 12 }}>
            <label className={styles.field}>
              <span>SMTP_HOST</span>
              <input value={current.smtpHost} onChange={(event) => update('smtpHost', event.target.value)} />
            </label>
            <label className={styles.field}>
              <span>SMTP_PORT</span>
              <input type="number" value={String(current.smtpPort ?? 587)} onChange={(event) => update('smtpPort', Number(event.target.value))} />
            </label>
            <label className={styles.field}>
              <span>SMTP_USER</span>
              <input value={current.smtpUser} onChange={(event) => update('smtpUser', event.target.value)} />
            </label>
            <label className={styles.field}>
              <span>SMTP_PASS</span>
              <input type="password" value={passwordDraft} onChange={(event) => setPasswordDraft(event.target.value)} placeholder="Leave blank to keep existing secret" />
            </label>
            <label className={styles.field}>
              <span>SMTP_FROM</span>
              <input value={current.fromEmail} onChange={(event) => update('fromEmail', event.target.value)} />
            </label>
            <label className={styles.field}>
              <span>SMTP_SECURE</span>
              <input type="checkbox" checked={Boolean(current.smtpSecure)} onChange={(event) => update('smtpSecure', event.target.checked)} />
            </label>
          </div>
          <label className={styles.field} style={{ marginTop: 12 }}>
            <span>From name</span>
            <input value={current.fromName} onChange={(event) => update('fromName', event.target.value)} />
          </label>
          <label className={styles.field} style={{ marginTop: 12 }}>
            <span>Reply to</span>
            <input value={current.replyToEmail} onChange={(event) => update('replyToEmail', event.target.value)} />
          </label>
          <label className={styles.field} style={{ marginTop: 12 }}>
            <span>Support email</span>
            <input value={current.supportEmail} onChange={(event) => update('supportEmail', event.target.value)} />
          </label>
          <label className={styles.field} style={{ marginTop: 12 }}>
            <span>Support phone</span>
            <input value={current.supportPhone} onChange={(event) => update('supportPhone', event.target.value)} />
          </label>
          <label className={styles.field} style={{ marginTop: 12 }}>
            <span>Notes</span>
            <textarea value={current.notes ?? ''} onChange={(event) => update('notes', event.target.value)} />
          </label>
          <div className={styles.buttonRow} style={{ marginTop: 12 }}>
            <button type="button" className={styles.button} onClick={() => void save(current)} disabled={saving}>
              {saving ? 'Saving...' : 'Save configuration'}
            </button>
            <button type="button" className={styles.buttonSecondary} onClick={() => void testConfiguration()} disabled={testing}>
              {testing ? 'Testing...' : 'Test SMTP Configuration'}
            </button>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionTitle}>Test email</div>
          <div className={styles.subtle}>Send a real SMTP test message without blocking the business flow.</div>
          <div className={styles.field} style={{ marginTop: 12 }}>
            <span>Recipient email</span>
            <input value={testEmail} onChange={(event) => setTestEmail(event.target.value)} />
          </div>
          <div className={styles.inlineMeta} style={{ marginTop: 12 }}>
            <span>Last recipient: {current.lastAttemptRecipient ?? 'n/a'}</span>
            <span>Last event: {current.lastAttemptEventType ?? 'n/a'}</span>
            <span>Last transport: {current.lastAttemptTransport ?? 'n/a'}</span>
          </div>
          <div className={styles.subtle} style={{ marginTop: 12 }}>
            {current.lastAttemptError ? `Last error: ${current.lastAttemptError}` : 'No recent SMTP errors.'}
          </div>
        </div>
      </div>
    </div>
  );
}
