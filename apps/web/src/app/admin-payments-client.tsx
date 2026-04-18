'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { formatDateTime, formatMoney, normalizeFlowLabel, paymentMethodLabel, paymentStatusLabel, payoutStatusLabel } from './finance-utils';
import styles from './core-flow.module.css';

type AuthRedirectError = Error & {
  name: 'AuthRedirectError';
};

type AdminPaymentItem = {
  id: string;
  scope: 'order' | 'deal';
  orderId?: string | null;
  dealId?: string | null;
  status: string;
  method: string;
  provider: string;
  amountMinor: number;
  currency: string;
  externalId?: string | null;
  transactionId?: string | null;
  bankReference?: string | null;
  paymentReference?: string | null;
  createdAt: string;
  updatedAt: string;
  reviewState?: string;
  orderStatus?: string | null;
  dealStatus?: string | null;
  buyer?: string | null;
  supplier?: string | null;
};

type PaymentDetail = AdminPaymentItem & {
  instructions?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  attempts?: Array<{
    id: string;
    attemptType: string;
    method: string;
    provider: string;
    status: string;
    amountMinor: number;
    currency: string;
    externalId?: string | null;
    transactionId?: string | null;
    bankReference?: string | null;
    paymentReference?: string | null;
    note?: string | null;
    createdAt: string;
  }>;
  webhookEvents?: Array<{
    id: string;
    provider: string;
    externalId: string;
    status: string;
    createdAt: string;
    processedAt?: string | null;
    payload: unknown;
  }>;
  providerStatus?: Record<string, { status: string; isReady: boolean; providerName: string; providerType: string }>;
  manualPayment?: { enabled: boolean; paymentProofRequired: boolean; instructionsText: string; reviewQueueLabel: string };
  email?: { enabled: boolean; provider: string; supportEmail?: string; supportPhone?: string };
};

type EscrowTransaction = {
  id: string;
  dealId: string;
  status: string;
  currency: string;
  totalAmountMinor: number;
  heldAmountMinor: number;
  releasedAmountMinor: number;
  refundedAmountMinor: number;
  createdAt: string;
  updatedAt: string;
  deal?: { id: string; title?: string | null };
  ledgerEntries?: Array<{
    id: string;
    entryType: string;
    amountMinor: number;
    resultingHeldMinor: number;
    resultingReleasedMinor: number;
    resultingRefundedMinor: number;
    note?: string | null;
    createdAt: string;
  }>;
};

type PaymentListResponse = {
  items: AdminPaymentItem[];
  summary?: { total?: number; review?: number };
  providerStatus?: Record<string, { status: string; isReady: boolean; providerName: string; providerType: string }>;
};

type LoadState<T> = {
  loading: boolean;
  data: T;
  error: string | null;
};

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

function adminPaymentTitle(payment: AdminPaymentItem) {
  return payment.scope === 'deal' ? payment.paymentReference ?? payment.id : payment.paymentReference ?? payment.id;
}

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read file.'));
    reader.readAsDataURL(file);
  });
}

function PaymentActionForm({
  id,
  action,
  label,
  onDone
}: {
  id: string;
  action: 'mark-paid' | 'reject' | 'request-correction' | 'upload-proof';
  label: string;
  onDone: () => void;
}) {
  const [note, setNote] = useState('');
  const [reference, setReference] = useState('');
  const [bankReference, setBankReference] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [proofFileName, setProofFileName] = useState('');
  const [proofMimeType, setProofMimeType] = useState('');
  const [proofImageDataUrl, setProofImageDataUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await adminJson(`payments/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({
          note: note.trim() || undefined,
          paymentReference: reference.trim() || undefined,
          bankReference: bankReference.trim() || undefined,
          transactionId: transactionId.trim() || undefined,
          proofFileName: proofFileName.trim() || undefined,
          proofMimeType: proofMimeType.trim() || undefined,
          proofImageDataUrl: proofImageDataUrl.trim() || undefined
        })
      });
      setSuccess('Saved.');
      onDone();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Action failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div>
          <div className={styles.sectionTitle}>{label}</div>
          <div className={styles.muted}>Backend-driven action with audit trail.</div>
        </div>
        <button type="button" className={styles.button} onClick={() => void submit()} disabled={saving}>
          {saving ? 'Saving...' : label}
        </button>
      </div>

      {error ? <div className={styles.errorBox}>{error}</div> : null}
      {success ? <div className={styles.successBox}>{success}</div> : null}

      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          <span style={{ fontWeight: 700 }}>Payment reference</span>
          <input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Reference / invoice ref" />
        </label>
        <label className={styles.field}>
          <span style={{ fontWeight: 700 }}>Bank reference</span>
          <input value={bankReference} onChange={(event) => setBankReference(event.target.value)} placeholder="Bank ref" />
        </label>
        <label className={styles.field}>
          <span style={{ fontWeight: 700 }}>Transaction ID</span>
          <input value={transactionId} onChange={(event) => setTransactionId(event.target.value)} placeholder="Transaction ID" />
        </label>
        <label className={styles.field}>
          <span style={{ fontWeight: 700 }}>Note</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note" />
        </label>
      </div>

      {action === 'upload-proof' ? (
        <div className={styles.fieldGrid} style={{ marginTop: 16 }}>
          <label className={styles.field}>
            <span style={{ fontWeight: 700 }}>Proof file</span>
            <input
              type="file"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  return;
                }
                setProofFileName(file.name);
                setProofMimeType(file.type);
                setProofImageDataUrl(await fileToDataUrl(file));
              }}
            />
          </label>
          <label className={styles.field}>
            <span style={{ fontWeight: 700 }}>Proof file name</span>
            <input value={proofFileName} onChange={(event) => setProofFileName(event.target.value)} />
          </label>
          <label className={styles.field}>
            <span style={{ fontWeight: 700 }}>Proof mime type</span>
            <input value={proofMimeType} onChange={(event) => setProofMimeType(event.target.value)} />
          </label>
        </div>
      ) : null}
    </div>
  );
}

function EscrowActionForm({
  transactionId,
  action,
  label,
  onDone
}: {
  transactionId: string;
  action: 'release' | 'payout-failed';
  label: string;
  onDone: () => void;
}) {
  const [amountMinor, setAmountMinor] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await paymentJson(`transactions/${transactionId}/${action}`, {
        method: 'POST',
        body:
          action === 'release'
            ? JSON.stringify({
                ...(amountMinor.trim() ? { amountMinor: Number(amountMinor) } : {}),
                note: note.trim() || undefined
              })
            : JSON.stringify({
                note: note.trim() || undefined
              })
      });

      setSuccess('Saved.');
      onDone();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Action failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div>
          <div className={styles.sectionTitle}>{label}</div>
          <div className={styles.muted}>Backend escrow action with audit trail.</div>
        </div>
        <button type="button" className={styles.button} onClick={() => void submit()} disabled={saving}>
          {saving ? 'Saving...' : label}
        </button>
      </div>

      {error ? <div className={styles.errorBox}>{error}</div> : null}
      {success ? <div className={styles.successBox}>{success}</div> : null}

      <div className={styles.fieldGrid}>
        {action === 'release' ? (
          <label className={styles.field}>
            <span style={{ fontWeight: 700 }}>Amount minor</span>
            <input value={amountMinor} onChange={(event) => setAmountMinor(event.target.value)} placeholder="Optional full or partial release" />
          </label>
        ) : null}
        <label className={styles.field}>
          <span style={{ fontWeight: 700 }}>Note</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note" />
        </label>
      </div>
    </div>
  );
}

function paymentSummary(payment: AdminPaymentItem) {
  return `${payment.scope.toUpperCase()} · ${payment.method} · ${payment.provider}`;
}

function paymentFlowLabel(payment: AdminPaymentItem) {
  return normalizeFlowLabel(payment.scope);
}

function paymentStatusClass(status?: string | null) {
  if (['paid', 'authorized', 'released'].includes(status ?? '')) {
    return `${styles.status} ${styles.statusSuccess}`;
  }

  if (['failed', 'cancelled', 'refunded', 'mismatch_detected', 'disputed'].includes(status ?? '')) {
    return `${styles.status} ${styles.statusError}`;
  }

  return `${styles.status} ${styles.statusWarning}`;
}

async function paymentJson<T>(path: string, init?: RequestInit) {
  const hasBody = init?.body !== undefined && init?.body !== null;
  return fetch(`/api/payments/${path}`, {
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

        throw new Error('Authentication required');
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

export function AdminPaymentsBoard({
  mode,
  paymentId
}: {
  mode: 'list' | 'review' | 'detail';
  paymentId?: string;
}) {
  const [state, setState] = useState<LoadState<PaymentListResponse | PaymentDetail>>({
    loading: true,
    data: { items: [] },
    error: null
  });
  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);

  const [statusFilter, setStatusFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [flowFilter, setFlowFilter] = useState('');

  async function loadData() {
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const query = new URLSearchParams();
      query.set('limit', '50');
      if (statusFilter) {
        query.set('status', statusFilter);
      }
      if (providerFilter) {
        query.set('provider', providerFilter);
      }
      if (flowFilter) {
        query.set('scope', flowFilter === 'b2c' ? 'order' : 'deal');
      }

      const path =
        mode === 'detail' && paymentId
          ? `payments/${paymentId}`
          : mode === 'review'
            ? `payments/review?${query.toString()}`
            : `payments?${query.toString()}`;

      const [data, escrowTransactions] = await Promise.all([
        adminJson<PaymentListResponse | PaymentDetail>(path),
        paymentJson<EscrowTransaction[]>('transactions')
      ]);
      setState({ loading: false, data, error: null });
      setTransactions(escrowTransactions);
    } catch (error) {
      setState({
        loading: false,
        data: { items: [] },
        error: error instanceof Error ? error.message : 'Unable to load payment ops.'
      });
      setTransactions([]);
    }
  }

  useEffect(() => {
    void loadData();
    const interval = setInterval(() => {
      void loadData();
    }, 15_000);
    return () => clearInterval(interval);
  }, [mode, paymentId, statusFilter, providerFilter, flowFilter]);

  const list = useMemo(() => {
    if ('items' in state.data) {
      return state.data.items;
    }

    return [state.data];
  }, [state.data]);

  const detail = 'items' in state.data ? null : state.data;
  const relatedTransaction = detail?.dealId ? transactions.find((transaction) => transaction.dealId === detail.dealId) ?? null : null;

  if (state.loading) {
    return <div className={styles.emptyState}>Loading payment operations...</div>;
  }

  if (state.error) {
    return <div className={styles.errorBox}>{state.error}</div>;
  }

  if (mode === 'detail' && detail) {
    return (
      <div className={styles.stack} style={{ gap: 18 }}>
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionTitle}>{adminPaymentTitle(detail)}</div>
              <div className={styles.muted}>{paymentSummary(detail)}</div>
            </div>
            <Link href="/admin/payments/review" className={styles.buttonSecondary}>
              Review queue
            </Link>
          </div>
          <div className={styles.metaRow}>
            <span className={paymentStatusClass(detail.status)}>{paymentStatusLabel(detail.status)}</span>
            <span>{formatMoney(detail.amountMinor, detail.currency)}</span>
            <span>Flow: {paymentFlowLabel(detail)}</span>
            <span>Order: {detail.orderId ?? 'n/a'}</span>
            <span>Deal: {detail.dealId ?? 'n/a'}</span>
            <span>Review: {detail.reviewState ?? 'clear'}</span>
          </div>
          <div className={styles.helper} style={{ marginTop: 12 }}>
            Provider statuses are backend-synced and show fallback mode when live credentials are missing.
          </div>
        </div>

        <div className={styles.cardGrid}>
          <div className={styles.card}>
            <div className={styles.sectionTitle}>Payment</div>
            <div className={styles.row}><span className={styles.label}>Method</span><span>{paymentMethodLabel(detail.method)}</span></div>
            <div className={styles.row}><span className={styles.label}>Provider</span><span>{detail.provider}</span></div>
            <div className={styles.row}><span className={styles.label}>Reference</span><span>{detail.paymentReference ?? 'n/a'}</span></div>
            <div className={styles.row}><span className={styles.label}>Transaction</span><span>{detail.transactionId ?? 'n/a'}</span></div>
            <div className={styles.row}><span className={styles.label}>Bank ref</span><span>{detail.bankReference ?? 'n/a'}</span></div>
          </div>
          <div className={styles.card}>
            <div className={styles.sectionTitle}>Parties</div>
            <div className={styles.row}><span className={styles.label}>Buyer</span><span>{detail.buyer ?? 'n/a'}</span></div>
            <div className={styles.row}><span className={styles.label}>Supplier</span><span>{detail.supplier ?? 'n/a'}</span></div>
            <div className={styles.row}><span className={styles.label}>Order status</span><span>{detail.orderStatus ?? 'n/a'}</span></div>
            <div className={styles.row}><span className={styles.label}>Deal status</span><span>{detail.dealStatus ?? 'n/a'}</span></div>
          </div>
          <div className={styles.card}>
            <div className={styles.sectionTitle}>Provider status</div>
            <div className={styles.helper}>
              {Object.entries(detail.providerStatus ?? {}).map(([key, provider]) => (
                <div key={key} className={styles.row} style={{ marginTop: 8 }}>
                  <span className={styles.label}>{provider.providerName}</span>
                  <span>{provider.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {detail.instructions ? (
          <div className={styles.sectionCard}>
            <div className={styles.sectionTitle}>Instructions</div>
            <div className={styles.instructionList}>
              {Object.entries(detail.instructions).map(([label, value]) => (
                <div key={label} className={styles.instructionRow}>
                  <span>{label}</span>
                  <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {detail.metadata ? (
          <div className={styles.sectionCard}>
            <div className={styles.sectionTitle}>Metadata</div>
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(detail.metadata, null, 2)}</pre>
          </div>
        ) : null}

        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}>Documents</div>
          <div className={styles.buttonRow}>
            <Link href={`/invoice/${detail.dealId ?? detail.orderId ?? detail.id}/pdf`} className={styles.buttonSecondary}>
              Invoice PDF
            </Link>
            {detail.dealId ? (
              <>
                <Link href={`/deals/${detail.dealId}/pdf`} className={styles.buttonSecondary}>
                  Deal summary
                </Link>
                <Link href={`/deals/${detail.dealId}/escrow-pdf`} className={styles.buttonSecondary}>
                  Escrow summary
                </Link>
              </>
            ) : null}
          </div>
        </div>

        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}>Actions</div>
          <div className={styles.buttonRow}>
            <PaymentActionForm id={detail.id} action="mark-paid" label="Mark paid" onDone={() => void loadData()} />
            <PaymentActionForm id={detail.id} action="request-correction" label="Request correction" onDone={() => void loadData()} />
          </div>
          <div className={styles.buttonRow} style={{ marginTop: 16 }}>
            <PaymentActionForm id={detail.id} action="reject" label="Reject" onDone={() => void loadData()} />
            <PaymentActionForm id={detail.id} action="upload-proof" label="Upload proof" onDone={() => void loadData()} />
          </div>
        </div>

        {relatedTransaction ? (
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionTitle}>Escrow timeline</div>
                <div className={styles.muted}>
                  {relatedTransaction.deal?.title ?? `Deal ${relatedTransaction.dealId.slice(0, 8)}`} · {payoutStatusLabel(relatedTransaction.status)}
                </div>
              </div>
              <span className={paymentStatusClass(relatedTransaction.status)}>{payoutStatusLabel(relatedTransaction.status)}</span>
            </div>
            <div className={styles.inlineMeta}>
              <span>Held: {formatMoney(relatedTransaction.heldAmountMinor, relatedTransaction.currency)}</span>
              <span>Released: {formatMoney(relatedTransaction.releasedAmountMinor, relatedTransaction.currency)}</span>
              <span>Refunded: {formatMoney(relatedTransaction.refundedAmountMinor, relatedTransaction.currency)}</span>
              <span>Updated: {formatDateTime(relatedTransaction.updatedAt)}</span>
            </div>
            <div className={styles.stack} style={{ marginTop: 12 }}>
              {(relatedTransaction.ledgerEntries ?? []).length ? (
                relatedTransaction.ledgerEntries?.map((entry) => (
                  <div key={entry.id} className={styles.card}>
                    <div className={styles.row}><span className={styles.label}>Event</span><span>{entry.entryType}</span></div>
                    <div className={styles.row}><span className={styles.label}>Amount</span><span>{formatMoney(entry.amountMinor, relatedTransaction.currency)}</span></div>
                    <div className={styles.row}><span className={styles.label}>Note</span><span>{entry.note ?? 'n/a'}</span></div>
                    <div className={styles.row}><span className={styles.label}>Created</span><span>{formatDateTime(entry.createdAt)}</span></div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>No escrow events recorded yet.</div>
              )}
            </div>
            <div className={styles.buttonRow} style={{ marginTop: 16 }}>
              <EscrowActionForm transactionId={relatedTransaction.id} action="release" label="Approve release" onDone={() => void loadData()} />
              <EscrowActionForm transactionId={relatedTransaction.id} action="payout-failed" label="Mark payout failed" onDone={() => void loadData()} />
            </div>
          </div>
        ) : null}

        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}>Webhook events</div>
          {(detail.webhookEvents ?? []).length ? (
            <div className={styles.stack}>
              {detail.webhookEvents?.map((event) => (
                <div key={event.id} className={styles.card}>
                  <div className={styles.row}><span className={styles.label}>Provider</span><span>{event.provider}</span></div>
                  <div className={styles.row}><span className={styles.label}>External ID</span><span>{event.externalId}</span></div>
                  <div className={styles.row}><span className={styles.label}>Status</span><span>{event.status}</span></div>
                  <div className={styles.row}><span className={styles.label}>Created</span><span>{new Date(event.createdAt).toLocaleString()}</span></div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>No webhook events recorded yet.</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.stack} style={{ gap: 18 }}>
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionTitle}>{mode === 'review' ? 'Payment review queue' : 'Payment operations'}</div>
              <div className={styles.muted}>Backend truth source with webhook, review, and reconciliation control.</div>
            </div>
            <div className={styles.buttonRow}>
              <Link href="/admin/payments" className={styles.buttonSecondary}>
                All payments
              </Link>
              <Link href="/admin/payments/review" className={styles.button}>
                Review queue
              </Link>
            </div>
          </div>
          <div className={styles.fieldGrid} style={{ marginTop: 18 }}>
          <label className={styles.field}>
            <span style={{ fontWeight: 700 }}>Flow</span>
            <select value={flowFilter} onChange={(event) => setFlowFilter(event.target.value)}>
              <option value="">All flows</option>
              <option value="b2c">B2C</option>
              <option value="b2b">B2B</option>
            </select>
          </label>
          <label className={styles.field}>
            <span style={{ fontWeight: 700 }}>Status filter</span>
            <input value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} placeholder="paid,requires_review" />
          </label>
          <label className={styles.field}>
            <span style={{ fontWeight: 700 }}>Provider filter</span>
            <input value={providerFilter} onChange={(event) => setProviderFilter(event.target.value)} placeholder="airwallex" />
          </label>
        </div>
      </div>

      <div className={styles.inlineMeta}>
        <span>Total: {(state.data as PaymentListResponse).summary?.total ?? list.length}</span>
        <span>Review: {(state.data as PaymentListResponse).summary?.review ?? list.filter((item) => item.reviewState === 'needs_review').length}</span>
        <span>Transactions: {transactions.length}</span>
      </div>

      <div className={styles.stack}>
        {list.length ? (
          list.map((payment) => (
            <div key={payment.id} className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <div className={styles.sectionTitle}>{adminPaymentTitle(payment)}</div>
                  <div className={styles.muted}>
                    {paymentSummary(payment)} · {formatMoney(payment.amountMinor, payment.currency)}
                  </div>
                </div>
                <span className={paymentStatusClass(payment.status)}>{paymentStatusLabel(payment.status)}</span>
              </div>
              <div className={styles.inlineMeta} style={{ marginTop: 12 }}>
                <span>Flow: {paymentFlowLabel(payment)}</span>
                <span>Buyer: {payment.buyer ?? 'n/a'}</span>
                <span>Supplier: {payment.supplier ?? 'n/a'}</span>
                <span>Order: {payment.orderStatus ?? 'n/a'}</span>
                <span>Deal: {payment.dealStatus ?? 'n/a'}</span>
                <span>Review: {payment.reviewState ?? 'clear'}</span>
              </div>
              <div className={styles.buttonRow} style={{ marginTop: 12 }}>
                <Link href={`/admin/payments/${payment.id}`} className={styles.buttonSecondary}>
                  Open
                </Link>
                {mode === 'review' || payment.reviewState === 'needs_review' ? (
                  <Link href={`/admin/payments/${payment.id}`} className={styles.button}>
                    Review
                  </Link>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>No payment records found for this view.</div>
        )}
      </div>
    </div>
  );
}
