'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import styles from './core-flow.module.css';

type AuthRedirectError = Error & {
  name: 'AuthRedirectError';
};

type AdminSettingRow = {
  id: string;
  key: string;
  section: string;
  value: Record<string, unknown>;
  updatedAt: string;
};

type LoadState<T> = {
  loading: boolean;
  data: T;
  error: string | null;
};

type FieldType = 'text' | 'password' | 'number' | 'textarea' | 'checkbox' | 'select' | 'comma-list';

type FieldSpec = {
  name: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
  helper?: string;
  options?: Array<{ value: string; label: string }>;
};

type SettingCardProps = {
  title: string;
  description: string;
  settingKey: string;
  section: string;
  value: Record<string, unknown>;
  fields: FieldSpec[];
  onSave: (settingKey: string, section: string, payload: Record<string, unknown>) => Promise<void>;
};

const settingKeys = {
  airwallexProvider: 'payment-provider:airwallex',
  internalManualProvider: 'payment-provider:internal_manual',
  bankTransferProvider: 'payment-provider:bank_transfer',
  bankReceiving: 'bank-receiving:primary',
  platformReceiving: 'platform-receiving:default',
  manualPayment: 'manual-payment:default',
  compliance: 'compliance:default',
  email: 'email:default',
  paymentRouting: 'payment-routing:default'
} as const;

function adminJson<T>(path: string, init?: RequestInit) {
  const hasBody = init?.body !== undefined && init?.body !== null;
  return fetch(`/api/admin/${path}`, {
    ...init,
    headers: {
      ...(hasBody ? { 'content-type': 'application/json' } : {}),
      ...(init?.headers ?? {})
    },
    cache: 'no-store'
  }).then(async (response) => {
    const text = await response.text();
    let data: unknown = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        if (typeof window !== 'undefined') {
          window.location.assign(`/signin?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        }

        const error = new Error('Authentication required') as AuthRedirectError;
        error.name = 'AuthRedirectError';
        throw error;
      }

      const message =
        typeof data === 'object' && data !== null && 'message' in data && typeof (data as { message?: unknown }).message === 'string'
          ? String((data as { message: string }).message)
          : `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    return data as T;
  });
}

function getRowValue(rows: AdminSettingRow[], key: string) {
  return rows.find((row) => row.key === key)?.value ?? {};
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asCommaList(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string').join(', ');
  }

  return '';
}

function toPayload(fields: FieldSpec[], draft: Record<string, string | boolean>) {
  const payload: Record<string, unknown> = {};

  for (const field of fields) {
    const value = draft[field.name];

    if (field.type === 'checkbox') {
      payload[field.name] = Boolean(value);
      continue;
    }

    if (field.type === 'number') {
      const numberValue = Number(value);
      if (!Number.isNaN(numberValue)) {
        payload[field.name] = numberValue;
      }
      continue;
    }

    if (field.type === 'comma-list') {
      const entries = String(value ?? '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
      payload[field.name] = entries;
      continue;
    }

    if (field.type === 'password' && String(value ?? '').trim().length === 0) {
      continue;
    }

    payload[field.name] = String(value ?? '');
  }

  return payload;
}

function SettingCard({ title, description, settingKey, section, value, fields, onSave }: SettingCardProps) {
  const [draft, setDraft] = useState<Record<string, string | boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const next: Record<string, string | boolean> = {};

    for (const field of fields) {
      const current = value[field.name];
      if (field.type === 'checkbox') {
        next[field.name] = asBoolean(current);
      } else if (field.type === 'number') {
        next[field.name] = String(asNumber(current, 0));
      } else if (field.type === 'comma-list') {
        next[field.name] = asCommaList(current);
      } else if (field.type === 'password') {
        next[field.name] = '';
      } else {
        next[field.name] = asString(current, '');
      }
    }

    setDraft(next);
  }, [settingKey, value]);

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await onSave(settingKey, section, toPayload(fields, draft));
      setSuccess('Saved.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to save setting.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div>
          <div className={styles.sectionTitle}>{title}</div>
          <div className={styles.muted}>{description}</div>
        </div>
        <button type="button" className={styles.button} onClick={() => void save()} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {error ? <div className={styles.errorBox} style={{ marginBottom: 12 }}>{error}</div> : null}
      {success ? <div className={styles.successBox} style={{ marginBottom: 12 }}>{success}</div> : null}

      <div className={styles.fieldGrid}>
        {fields.map((field) => (
          <label className={styles.field} key={field.name}>
            <span style={{ fontWeight: 700, color: '#374151' }}>{field.label}</span>
            {field.type === 'textarea' ? (
              <textarea
                value={String(draft[field.name] ?? '')}
                placeholder={field.placeholder}
                onChange={(event) => setDraft((current) => ({ ...current, [field.name]: event.target.value }))}
              />
            ) : field.type === 'checkbox' ? (
              <input
                type="checkbox"
                checked={Boolean(draft[field.name])}
                onChange={(event) => setDraft((current) => ({ ...current, [field.name]: event.target.checked }))}
              />
            ) : field.type === 'select' ? (
              <select
                value={String(draft[field.name] ?? '')}
                onChange={(event) => setDraft((current) => ({ ...current, [field.name]: event.target.value }))}
                style={{
                  width: '100%',
                  border: '1px solid #d1d5db',
                  borderRadius: 10,
                  padding: '10px 12px',
                  font: 'inherit',
                  color: '#111827',
                  background: '#fff'
                }}
              >
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
                value={String(draft[field.name] ?? '')}
                placeholder={field.placeholder}
                onChange={(event) => setDraft((current) => ({ ...current, [field.name]: event.target.value }))}
              />
            )}
            {field.helper ? <span className={styles.muted}>{field.helper}</span> : null}
            {field.type === 'password' ? <span className={styles.muted}>Leave blank to keep stored secret.</span> : null}
          </label>
        ))}
      </div>
    </article>
  );
}

export function AdminApiConnectionsBoard({ view }: { view: 'connections' | 'banks' }) {
  const [state, setState] = useState<LoadState<AdminSettingRow[] | null>>({
    loading: true,
    data: null,
    error: null
  });

  async function loadSettings() {
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const response = await adminJson<AdminSettingRow[]>('settings');
      setState({ loading: false, data: response, error: null });
    } catch (error) {
      if ((error as AuthRedirectError).name === 'AuthRedirectError') {
        return;
      }

      setState({
        loading: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unable to load settings.'
      });
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  const rows = state.data ?? [];
  const providerAirwallex = getRowValue(rows, settingKeys.airwallexProvider);
  const providerInternal = getRowValue(rows, settingKeys.internalManualProvider);
  const providerBankTransfer = getRowValue(rows, settingKeys.bankTransferProvider);
  const bankReceiving = getRowValue(rows, settingKeys.bankReceiving);
  const platformReceiving = getRowValue(rows, settingKeys.platformReceiving);
  const manualPayment = getRowValue(rows, settingKeys.manualPayment);
  const compliance = getRowValue(rows, settingKeys.compliance);
  const email = getRowValue(rows, settingKeys.email);
  const routing = getRowValue(rows, settingKeys.paymentRouting);
  const providerCount = [providerAirwallex, providerInternal, providerBankTransfer].filter((value) => Object.keys(value).length > 0).length;

  async function saveSetting(settingKey: string, section: string, payload: Record<string, unknown>) {
    await adminJson(`settings/${encodeURIComponent(settingKey)}`, {
      method: 'PUT',
      body: JSON.stringify({ section, value: payload })
    });
    await loadSettings();
  }

  if (state.loading && !rows.length) {
    return <div className={styles.emptyState}>Loading API connections...</div>;
  }

  return (
    <div className={styles.grid}>
      {state.error ? <div className={styles.errorBox}>{state.error}</div> : null}

      <div className={styles.inlineMeta}>
        <span>Provider connections: {providerCount}</span>
        <span>Manual payment: {asBoolean(manualPayment.enabled) ? 'enabled' : 'disabled'}</span>
        <span>Email: {asBoolean(email.enabled) ? 'enabled' : 'disabled'}</span>
      </div>

      <div className={styles.stack}>
        {view === 'connections' ? (
          <>
            <SettingCard
              title="Airwallex provider connection"
              description="Hosted checkout, card, QR, and future collection instructions."
              settingKey={settingKeys.airwallexProvider}
              section="payment-providers"
              value={providerAirwallex}
              fields={[
                { name: 'providerName', label: 'Provider name', placeholder: 'Airwallex' },
                { name: 'providerType', label: 'Provider type', placeholder: 'airwallex' },
                {
                  name: 'mode',
                  label: 'Mode',
                  type: 'select',
                  options: [
                    { value: 'test', label: 'Test' },
                    { value: 'live', label: 'Live' }
                  ]
                },
                { name: 'enabled', label: 'Enabled', type: 'checkbox' },
                { name: 'publicKey', label: 'Public key', placeholder: 'pk_...' },
                { name: 'secretKey', label: 'Secret key', type: 'password', placeholder: 'sk_...' },
                { name: 'webhookSecret', label: 'Webhook secret', type: 'password', placeholder: 'whsec_...' },
                { name: 'merchantId', label: 'Merchant ID' },
                { name: 'terminalId', label: 'Terminal ID' },
                { name: 'accountId', label: 'Account ID' },
                { name: 'clientId', label: 'Client ID' },
                { name: 'clientSecret', label: 'Client secret', type: 'password' },
                { name: 'apiBaseUrl', label: 'API base URL' },
                { name: 'callbackUrl', label: 'Callback URL' },
                { name: 'returnUrl', label: 'Return URL' },
                { name: 'statusEndpoint', label: 'Status endpoint' },
                { name: 'notes', label: 'Notes', type: 'textarea' }
              ]}
              onSave={saveSetting}
            />

            <SettingCard
              title="Internal manual fallback"
              description="Controlled fallback for manual confirmation and reconciliation."
              settingKey={settingKeys.internalManualProvider}
              section="payment-providers"
              value={providerInternal}
              fields={[
                { name: 'providerName', label: 'Provider name' },
                { name: 'providerType', label: 'Provider type' },
                { name: 'mode', label: 'Mode', type: 'select', options: [{ value: 'test', label: 'Test' }, { value: 'live', label: 'Live' }] },
                { name: 'enabled', label: 'Enabled', type: 'checkbox' },
                { name: 'returnUrl', label: 'Return URL' },
                { name: 'notes', label: 'Notes', type: 'textarea' }
              ]}
              onSave={saveSetting}
            />

            <SettingCard
              title="Bank transfer provider"
              description="Bank rail instructions and manual reconciliation support."
              settingKey={settingKeys.bankTransferProvider}
              section="payment-providers"
              value={providerBankTransfer}
              fields={[
                { name: 'providerName', label: 'Provider name' },
                { name: 'providerType', label: 'Provider type' },
                { name: 'mode', label: 'Mode', type: 'select', options: [{ value: 'test', label: 'Test' }, { value: 'live', label: 'Live' }] },
                { name: 'enabled', label: 'Enabled', type: 'checkbox' },
                { name: 'callbackUrl', label: 'Callback URL' },
                { name: 'returnUrl', label: 'Return URL' },
                { name: 'notes', label: 'Notes', type: 'textarea' }
              ]}
              onSave={saveSetting}
            />

            <SettingCard
              title="Payment routing"
              description="Default provider per payment method."
              settingKey={settingKeys.paymentRouting}
              section="payment-routing"
              value={routing}
              fields={[
                {
                  name: 'card',
                  label: 'Card',
                  type: 'select',
                  options: [
                    { value: 'airwallex', label: 'Airwallex' },
                    { value: 'internal_manual', label: 'Internal manual' }
                  ]
                },
                {
                  name: 'qr',
                  label: 'QR',
                  type: 'select',
                  options: [
                    { value: 'airwallex', label: 'Airwallex' },
                    { value: 'internal_manual', label: 'Internal manual' }
                  ]
                },
                {
                  name: 'bank_transfer',
                  label: 'Bank transfer',
                  type: 'select',
                  options: [
                    { value: 'internal_manual', label: 'Internal manual' },
                    { value: 'airwallex', label: 'Airwallex' }
                  ]
                },
                {
                  name: 'swift',
                  label: 'SWIFT',
                  type: 'select',
                  options: [
                    { value: 'internal_manual', label: 'Internal manual' },
                    { value: 'airwallex', label: 'Airwallex' }
                  ]
                },
                {
                  name: 'iban_invoice',
                  label: 'IBAN invoice',
                  type: 'select',
                  options: [
                    { value: 'internal_manual', label: 'Internal manual' },
                    { value: 'airwallex', label: 'Airwallex' }
                  ]
                },
                {
                  name: 'manual',
                  label: 'Manual',
                  type: 'select',
                  options: [
                    { value: 'internal_manual', label: 'Internal manual' },
                    { value: 'airwallex', label: 'Airwallex' }
                  ]
                }
              ]}
              onSave={saveSetting}
            />

            <SettingCard
              title="Email settings"
              description="SMTP or provider-ready config for outbound messaging."
              settingKey={settingKeys.email}
              section="email"
              value={email}
              fields={[
                { name: 'enabled', label: 'Enabled', type: 'checkbox' },
                { name: 'provider', label: 'Provider' },
                { name: 'smtpHost', label: 'SMTP host' },
                { name: 'smtpPort', label: 'SMTP port', type: 'number' },
                { name: 'smtpUser', label: 'SMTP user' },
                { name: 'smtpPassword', label: 'SMTP password', type: 'password' },
                { name: 'fromName', label: 'From name' },
                { name: 'fromEmail', label: 'From email' },
                { name: 'replyToEmail', label: 'Reply-to email' },
                { name: 'supportEmail', label: 'Support email' },
                { name: 'supportPhone', label: 'Support phone' },
                { name: 'notes', label: 'Notes', type: 'textarea' }
              ]}
              onSave={saveSetting}
            />
          </>
        ) : (
          <>
            <SettingCard
              title="Bank receiving details"
              description="Used automatically in invoices and bank transfer instructions."
              settingKey={settingKeys.bankReceiving}
              section="bank-receiving"
              value={bankReceiving}
              fields={[
                { name: 'beneficiaryName', label: 'Beneficiary name' },
                { name: 'legalEntityName', label: 'Legal entity name' },
                { name: 'bankName', label: 'Bank name' },
                { name: 'bankAddress', label: 'Bank address' },
                { name: 'accountNumber', label: 'Account number' },
                { name: 'iban', label: 'IBAN' },
                { name: 'swiftBic', label: 'SWIFT/BIC' },
                { name: 'routingNumber', label: 'Routing number' },
                { name: 'branchCode', label: 'Branch code' },
                { name: 'intermediaryBank', label: 'Intermediary bank' },
                { name: 'paymentReferencePrefix', label: 'Payment reference prefix' },
                { name: 'invoicePrefix', label: 'Invoice prefix' },
                { name: 'supportEmail', label: 'Support email' },
                { name: 'supportPhone', label: 'Support phone' }
              ]}
              onSave={saveSetting}
            />

            <SettingCard
              title="Platform receiving details"
              description="Auto-populated invoice entity and footer data."
              settingKey={settingKeys.platformReceiving}
              section="platform-receiving"
              value={platformReceiving}
              fields={[
                { name: 'platformLegalName', label: 'Platform legal name' },
                { name: 'platformAddress', label: 'Platform address', type: 'textarea' },
                { name: 'platformRegistrationNumber', label: 'Registration number' },
                { name: 'taxVatNumber', label: 'Tax / VAT number' },
                { name: 'invoicingEmail', label: 'Invoicing email' },
                { name: 'defaultCurrency', label: 'Default currency' },
                { name: 'invoiceFooter', label: 'Invoice footer', type: 'textarea' },
                { name: 'paymentInstructionsText', label: 'Payment instructions text', type: 'textarea' },
                { name: 'complianceDisclaimerText', label: 'Compliance disclaimer', type: 'textarea' }
              ]}
              onSave={saveSetting}
            />

            <SettingCard
              title="Manual payment settings"
              description="Controls proof requirements and confirmation flow."
              settingKey={settingKeys.manualPayment}
              section="manual-payment"
              value={manualPayment}
              fields={[
                { name: 'enabled', label: 'Enabled', type: 'checkbox' },
                { name: 'paymentProofRequired', label: 'Payment proof required', type: 'checkbox' },
                { name: 'instructionsText', label: 'Instructions', type: 'textarea' },
                { name: 'whoConfirmsPayments', label: 'Who confirms payments' },
                { name: 'proofRequiredFields', label: 'Proof required fields', type: 'comma-list', helper: 'Comma-separated fields like paymentReference,proofImage' },
                { name: 'reviewQueueLabel', label: 'Review queue label' },
                { name: 'bankTransferInstructions', label: 'Bank transfer instructions', type: 'textarea' }
              ]}
              onSave={saveSetting}
            />

            <SettingCard
              title="Compliance / signature"
              description="Disclaimers, signature placeholder, and optional seal images."
              settingKey={settingKeys.compliance}
              section="compliance"
              value={compliance}
              fields={[
                { name: 'legalDisclaimer', label: 'Legal disclaimer', type: 'textarea' },
                { name: 'termsSnippet', label: 'Terms snippet', type: 'textarea' },
                { name: 'refundPaymentNote', label: 'Refund/payment note', type: 'textarea' },
                { name: 'complianceStatement', label: 'Compliance statement', type: 'textarea' },
                { name: 'signatureNameTitle', label: 'Signature name/title' },
                { name: 'signatureImageUrl', label: 'Signature image URL' },
                { name: 'companySealImageUrl', label: 'Company seal image URL' }
              ]}
              onSave={saveSetting}
            />
          </>
        )}
      </div>

      <div className={styles.inlineMeta}>
        <Link href="/admin" className={styles.buttonSecondary}>
          Back to Admin
        </Link>
        <Link href="/notifications" className={styles.buttonSecondary}>
          Notifications
        </Link>
        <Link href="/orders" className={styles.buttonSecondary}>
          Orders
        </Link>
      </div>
    </div>
  );
}
