'use client';

import { useActionState } from 'react';
import { testEmailConfigurationAction, updateEmailSettingsAction } from '../../actions';

type EmailSetting = {
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
};

type ActionState = {
  success: boolean;
  error: string | null;
  transport?: string;
  recipientEmail?: string;
  details?: unknown;
} | null;

function StatusLine({ title, state }: { title: string; state: ActionState }) {
  if (!state) {
    return null;
  }

  return (
    <p style={{ margin: 0, color: state.success ? '#86efac' : '#fca5a5' }}>
      {title}: {state.success ? 'success' : `error${state.error ? ` - ${state.error}` : ''}`}
    </p>
  );
}

export function SmtpSettingsClient({ current }: { current: EmailSetting }) {
  const [saveState, saveAction, savePending] = useActionState(updateEmailSettingsAction, null as ActionState);
  const [testState, testAction, testPending] = useActionState(testEmailConfigurationAction, null as ActionState);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
      <article style={{ padding: 16, background: '#111827', borderRadius: 12 }}>
        <h2 style={{ marginTop: 0 }}>SMTP configuration</h2>
        <p>Status: {current.enabled && current.smtpHost ? 'configured' : 'not configured'}</p>
        <p style={{ color: '#cbd5e1', lineHeight: 1.6 }}>
          Password reset emails and notification delivery depend on this configuration. Leave SMTP disabled only if recovery email should stay unavailable.
        </p>
        <form action={saveAction} style={{ display: 'grid', gap: 8 }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" name="enabled" defaultChecked={Boolean(current.enabled)} /> Enabled
          </label>
          <input name="smtpHost" defaultValue={current.smtpHost ?? ''} placeholder="SMTP_HOST" />
          <input name="smtpPort" defaultValue={String(current.smtpPort ?? 587)} placeholder="SMTP_PORT" type="number" />
          <input name="smtpUser" defaultValue={current.smtpUser ?? ''} placeholder="SMTP_USER" />
          <input name="smtpPassword" type="password" placeholder="SMTP_PASS (leave blank to keep)" />
          <input name="fromName" defaultValue={current.fromName ?? 'Alemhub Marketplace'} placeholder="SMTP_FROM_NAME" />
          <input name="fromEmail" defaultValue={current.fromEmail ?? 'noreply@alemhub.com'} placeholder="SMTP_FROM" />
          <input name="replyToEmail" defaultValue={current.replyToEmail ?? 'support@alemhub.com'} placeholder="Reply to" />
          <input name="supportEmail" defaultValue={current.supportEmail ?? 'support@alemhub.com'} placeholder="Support email" />
          <input name="supportPhone" defaultValue={current.supportPhone ?? ''} placeholder="Support phone" />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" name="smtpSecure" defaultChecked={Boolean(current.smtpSecure)} /> SMTP secure
          </label>
          <textarea name="notes" defaultValue={current.notes ?? ''} placeholder="Notes" />
          <button type="submit" disabled={savePending}>
            {savePending ? 'Saving...' : 'Save configuration'}
          </button>
        </form>
        <div style={{ marginTop: 12 }}>
          <StatusLine title="Save result" state={saveState} />
        </div>
      </article>

      <article style={{ padding: 16, background: '#111827', borderRadius: 12 }}>
        <h2 style={{ marginTop: 0 }}>Test SMTP</h2>
        <p style={{ color: '#cbd5e1', lineHeight: 1.6 }}>
          Use this after saving credentials to verify real delivery before enabling password reset for end users.
        </p>
        <form action={testAction} style={{ display: 'grid', gap: 8 }}>
          <input name="recipientEmail" defaultValue="ops@alemhub.com" placeholder="Test recipient email" />
          <input name="subject" defaultValue="Alemhub SMTP test" placeholder="Subject" />
          <textarea name="message" defaultValue="This is a test email from the Alemhub admin panel." placeholder="Message" />
          <button type="submit" disabled={testPending}>
            {testPending ? 'Sending...' : 'Test SMTP Configuration'}
          </button>
        </form>
        <div style={{ marginTop: 12, display: 'grid', gap: 4 }}>
          <StatusLine title="Test result" state={testState} />
          <strong>Last attempt</strong>
          <span>Status: {current.lastAttemptStatus ?? 'none'}</span>
          <span>Recipient: {current.lastAttemptRecipient ?? 'n/a'}</span>
          <span>Event: {current.lastAttemptEventType ?? 'n/a'}</span>
          <span>Transport: {current.lastAttemptTransport ?? 'n/a'}</span>
          <span>Error: {current.lastAttemptError ?? 'none'}</span>
        </div>
      </article>
    </div>
  );
}
