'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type AdminSettingRow = {
  id: string;
  key: string;
  section: string;
  value: Record<string, unknown>;
  updatedAt: string;
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
  if (Array.isArray(value)) return value.filter((i): i is string => typeof i === 'string').join(', ');
  return '';
}

function toPayload(fields: FieldSpec[], draft: Record<string, string | boolean>) {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const value = draft[field.name];
    if (field.type === 'checkbox') { payload[field.name] = Boolean(value); continue; }
    if (field.type === 'number') { const n = Number(value); if (!Number.isNaN(n)) payload[field.name] = n; continue; }
    if (field.type === 'comma-list') {
      payload[field.name] = String(value ?? '').split(',').map(s => s.trim()).filter(Boolean);
      continue;
    }
    if (field.type === 'password' && String(value ?? '').trim().length === 0) continue;
    payload[field.name] = String(value ?? '');
  }
  return payload;
}

function getRowValue(rows: AdminSettingRow[], key: string) {
  return rows.find(r => r.key === key)?.value ?? {};
}

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #334155', borderRadius: 8, padding: '9px 12px',
  font: 'inherit', fontSize: 13, color: '#f1f5f9', background: '#1e293b', outline: 'none', boxSizing: 'border-box'
};
const labelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#94a3b8'
};
const cardStyle: React.CSSProperties = {
  background: '#111827', borderRadius: 12, padding: '20px 22px', marginBottom: 16, border: '1px solid #1e293b'
};

function SettingCard({ title, description, settingKey, section, value, fields, onSave }: SettingCardProps) {
  const [draft, setDraft] = useState<Record<string, string | boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const next: Record<string, string | boolean> = {};
    for (const f of fields) {
      const cur = value[f.name];
      if (f.type === 'checkbox') next[f.name] = asBoolean(cur);
      else if (f.type === 'number') next[f.name] = String(asNumber(cur, 0));
      else if (f.type === 'comma-list') next[f.name] = asCommaList(cur);
      else if (f.type === 'password') next[f.name] = '';
      else next[f.name] = asString(cur, '');
    }
    setDraft(next);
  }, [settingKey, value]);

  async function save() {
    setSaving(true); setError(null); setSuccess(null);
    try {
      await onSave(settingKey, section, toPayload(fields, draft));
      setSuccess('Saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9', marginBottom: 3 }}>{title}</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>{description}</div>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          style={{
            background: saving ? '#334155' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
            padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer'
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      {error && <div style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 8, padding: '8px 12px', color: '#f87171', fontSize: 13, marginBottom: 10 }}>{error}</div>}
      {success && <div style={{ background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.3)', borderRadius: 8, padding: '8px 12px', color: '#34d399', fontSize: 13, marginBottom: 10 }}>✅ {success}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {fields.map(f => (
          <label style={labelStyle} key={f.name}>
            <span style={{ fontWeight: 600, color: '#cbd5e1', fontSize: 12 }}>{f.label}</span>
            {f.type === 'textarea' ? (
              <textarea
                value={String(draft[f.name] ?? '')}
                placeholder={f.placeholder}
                onChange={e => setDraft(d => ({ ...d, [f.name]: (e.currentTarget as HTMLTextAreaElement).value }))}
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              />
            ) : f.type === 'checkbox' ? (
              <input
                type="checkbox"
                checked={Boolean(draft[f.name])}
                onChange={e => setDraft(d => ({ ...d, [f.name]: (e.currentTarget as HTMLInputElement).checked }))}
                style={{ width: 18, height: 18, accentColor: '#3b82f6' }}
              />
            ) : f.type === 'select' ? (
              <select
                value={String(draft[f.name] ?? '')}
                onChange={e => setDraft(d => ({ ...d, [f.name]: (e.currentTarget as HTMLSelectElement).value }))}
                style={inputStyle}
              >
                {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input
                type={f.type === 'password' ? 'password' : f.type === 'number' ? 'number' : 'text'}
                value={String(draft[f.name] ?? '')}
                placeholder={f.placeholder}
                onChange={e => setDraft(d => ({ ...d, [f.name]: (e.currentTarget as HTMLInputElement).value }))}
                style={inputStyle}
              />
            )}
            {f.helper && <span style={{ fontSize: 11, color: '#475569' }}>{f.helper}</span>}
            {f.type === 'password' && <span style={{ fontSize: 11, color: '#475569' }}>Leave blank to keep stored secret.</span>}
          </label>
        ))}
      </div>
    </article>
  );
}

export function ApiConnectionsBoard({
  view,
  initialRows,
  accessToken,
  apiBase
}: {
  view: 'connections' | 'banks';
  initialRows: AdminSettingRow[];
  accessToken: string;
  apiBase: string;
}) {
  const [rows, setRows] = useState<AdminSettingRow[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  async function loadSettings() {
    setLoading(true); setGlobalError(null);
    try {
      const res = await fetch(`${apiBase}/admin/settings`, {
        headers: { authorization: `Bearer ${accessToken}` },
        cache: 'no-store'
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data: AdminSettingRow[] = await res.json() as AdminSettingRow[];
      setRows(data);
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : 'Failed to reload settings.');
    } finally {
      setLoading(false);
    }
  }

  async function saveSetting(settingKey: string, section: string, payload: Record<string, unknown>) {
    const res = await fetch(`${apiBase}/admin/settings/${encodeURIComponent(settingKey)}`, {
      method: 'PUT',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ section, value: payload })
    });
    if (!res.ok) {
      const text = await res.text();
      let msg = `Save failed (${res.status})`;
      try { const j = JSON.parse(text) as { message?: string }; if (j.message) msg = j.message; } catch { /* noop */ }
      throw new Error(msg);
    }
    await loadSettings();
  }

  const providerAirwallex = getRowValue(rows, settingKeys.airwallexProvider);
  const providerInternal = getRowValue(rows, settingKeys.internalManualProvider);
  const providerBankTransfer = getRowValue(rows, settingKeys.bankTransferProvider);
  const bankReceiving = getRowValue(rows, settingKeys.bankReceiving);
  const platformReceiving = getRowValue(rows, settingKeys.platformReceiving);
  const manualPayment = getRowValue(rows, settingKeys.manualPayment);
  const compliance = getRowValue(rows, settingKeys.compliance);
  const email = getRowValue(rows, settingKeys.email);
  const routing = getRowValue(rows, settingKeys.paymentRouting);

  return (
    <section style={{ padding: 24, display: 'grid', gap: 20 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>
            {view === 'connections' ? 'API Connections' : 'Bank & Invoice Details'}
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            {view === 'connections'
              ? 'Payment providers, routing, and email configuration.'
              : 'Receiving bank details, platform entity, and manual payment settings.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link
            href={view === 'connections' ? '/api-connections/banks' : '/api-connections'}
            style={{ display: 'inline-block', background: '#1e293b', color: '#94a3b8', padding: '8px 14px', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600, border: '1px solid #334155' }}
          >
            {view === 'connections' ? '🏦 Bank Details' : '🔌 Provider Connections'}
          </Link>
          <button
            type="button"
            onClick={() => void loadSettings()}
            disabled={loading}
            style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}
          >
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>
      </header>

      {globalError && (
        <div style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13 }}>
          ⚠️ {globalError}
        </div>
      )}

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
              { name: 'mode', label: 'Mode', type: 'select', options: [{ value: 'test', label: 'Test' }, { value: 'live', label: 'Live' }] },
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
              { name: 'card', label: 'Card', type: 'select', options: [{ value: 'airwallex', label: 'Airwallex' }, { value: 'internal_manual', label: 'Internal manual' }] },
              { name: 'qr', label: 'QR', type: 'select', options: [{ value: 'airwallex', label: 'Airwallex' }, { value: 'internal_manual', label: 'Internal manual' }] },
              { name: 'bank_transfer', label: 'Bank transfer', type: 'select', options: [{ value: 'internal_manual', label: 'Internal manual' }, { value: 'airwallex', label: 'Airwallex' }] },
              { name: 'swift', label: 'SWIFT', type: 'select', options: [{ value: 'internal_manual', label: 'Internal manual' }, { value: 'airwallex', label: 'Airwallex' }] },
              { name: 'iban_invoice', label: 'IBAN invoice', type: 'select', options: [{ value: 'internal_manual', label: 'Internal manual' }, { value: 'airwallex', label: 'Airwallex' }] },
              { name: 'manual', label: 'Manual', type: 'select', options: [{ value: 'internal_manual', label: 'Internal manual' }, { value: 'airwallex', label: 'Airwallex' }] }
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
              { name: 'proofRequiredFields', label: 'Proof required fields', type: 'comma-list', helper: 'Comma-separated, e.g. paymentReference,proofImage' },
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
    </section>
  );
}
