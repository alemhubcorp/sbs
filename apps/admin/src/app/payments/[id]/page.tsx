import Link from 'next/link';
import { requireAccessToken } from '../../../lib/auth';
import { adminMarkPaidAction, adminRejectPaymentAction, adminRequestCorrectionAction, adminUploadProofAction } from '../../actions';

export const dynamic = 'force-dynamic';

const internalBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

type PaymentDetail = {
  id: string;
  status: string;
  flow: string;
  currency: string;
  totalAmountMinor: number;
  heldAmountMinor?: number;
  releasedAmountMinor?: number;
  buyerProfile?: { id: string; displayName?: string; userId?: string };
  supplierProfile?: { id: string; displayName?: string; userId?: string };
  deal?: { id: string; title?: string };
  proofUrl?: string;
  note?: string;
  rejectionReason?: string;
  correctionMessage?: string;
  timeline?: Array<{ event: string; at: string; by?: string; note?: string }>;
  createdAt: string;
  updatedAt: string;
};

const statusColor: Record<string, string> = {
  pending: '#fbbf24',
  needs_review: '#f97316',
  paid: '#34d399',
  rejected: '#f87171',
  released: '#818cf8',
  refunded: '#94a3b8'
};

function fmt(minor: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(minor / 100);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export default async function PaymentDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const accessToken = await requireAccessToken(`/payments/${id}`);
  const sp = (await searchParams) ?? {};
  const success = typeof sp.success === 'string' ? sp.success : '';

  let payment: PaymentDetail | null = null;
  let error: string | null = null;

  try {
    const response = await fetch(`${internalBaseUrl}/api/admin/payments/${id}`, {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    payment = (await response.json()) as PaymentDetail;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load payment';
  }

  if (!payment) {
    return (
      <section style={{ padding: 24 }}>
        <Link href="/payments" style={{ color: '#64748b', textDecoration: 'none', fontSize: 13 }}>← Payments</Link>
        <div style={{ marginTop: 16, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: 20, color: '#f87171' }}>
          {error ?? 'Payment not found'}
        </div>
      </section>
    );
  }

  const statusCol = statusColor[payment.status] ?? '#94a3b8';
  const isActionable = ['pending', 'needs_review'].includes(payment.status);

  return (
    <section style={{ padding: 24, display: 'grid', gap: 20 }}>
      {/* Back nav */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13 }}>
        <Link href="/payments" style={{ color: '#64748b', textDecoration: 'none' }}>← All Payments</Link>
        <span style={{ color: '#1e293b' }}>/</span>
        <Link href="/payments/review" style={{ color: '#64748b', textDecoration: 'none' }}>Review Queue</Link>
      </div>

      {success && (
        <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 8, padding: '10px 14px', color: '#34d399', fontSize: 13 }}>
          ✅ {decodeURIComponent(success)}
        </div>
      )}

      {/* Header */}
      <header style={{ background: '#111827', borderRadius: 12, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{
                background: `${statusCol}22`, color: statusCol,
                borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 700
              }}>
                {payment.status}
              </span>
              <span style={{ color: '#475569', fontSize: 13 }}>{payment.flow ?? '—'}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#f1f5f9' }}>
              {fmt(payment.totalAmountMinor ?? 0, payment.currency ?? 'USD')}
            </div>
            <div style={{ fontFamily: 'monospace', color: '#475569', fontSize: 12, marginTop: 4 }}>
              {payment.id}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 4, textAlign: 'right', fontSize: 12, color: '#64748b' }}>
            <div>Created: {payment.createdAt ? fmtDate(payment.createdAt) : '—'}</div>
            <div>Updated: {payment.updatedAt ? fmtDate(payment.updatedAt) : '—'}</div>
          </div>
        </div>
      </header>

      {/* Details grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <article style={{ background: '#111827', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Parties
          </h3>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ background: '#0f172a', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Buyer</div>
              <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, marginTop: 3 }}>
                {payment.buyerProfile?.displayName ?? '—'}
              </div>
              {payment.buyerProfile?.id && (
                <div style={{ fontFamily: 'monospace', color: '#475569', fontSize: 11, marginTop: 1 }}>{payment.buyerProfile.id}</div>
              )}
            </div>
            <div style={{ background: '#0f172a', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Supplier</div>
              <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, marginTop: 3 }}>
                {payment.supplierProfile?.displayName ?? '—'}
              </div>
              {payment.supplierProfile?.id && (
                <div style={{ fontFamily: 'monospace', color: '#475569', fontSize: 11, marginTop: 1 }}>{payment.supplierProfile.id}</div>
              )}
            </div>
            {payment.deal && (
              <div style={{ background: '#0f172a', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Deal</div>
                <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, marginTop: 3 }}>
                  {payment.deal.title ?? payment.deal.id}
                </div>
              </div>
            )}
          </div>
        </article>

        <article style={{ background: '#111827', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Amounts
          </h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              { label: 'Total', value: payment.totalAmountMinor },
              { label: 'Held', value: payment.heldAmountMinor },
              { label: 'Released', value: payment.releasedAmountMinor }
            ].filter((row) => row.value != null).map((row) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#0f172a', borderRadius: 8 }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>{row.label}</span>
                <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13 }}>
                  {fmt(row.value!, payment.currency ?? 'USD')}
                </span>
              </div>
            ))}
          </div>

          {payment.proofUrl && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: '#0f172a', borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Payment Proof</div>
              <a href={payment.proofUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', fontSize: 13 }}>
                📎 View proof document
              </a>
            </div>
          )}

          {payment.note && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: '#0f172a', borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Note</div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>{payment.note}</div>
            </div>
          )}

          {payment.rejectionReason && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: '#2d1010', borderRadius: 8, border: '1px solid #4e131344' }}>
              <div style={{ fontSize: 10, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Rejection Reason</div>
              <div style={{ color: '#fca5a5', fontSize: 13 }}>{payment.rejectionReason}</div>
            </div>
          )}

          {payment.correctionMessage && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: '#1f1508', borderRadius: 8, border: '1px solid #78350f44' }}>
              <div style={{ fontSize: 10, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Correction Message</div>
              <div style={{ color: '#fde68a', fontSize: 13 }}>{payment.correctionMessage}</div>
            </div>
          )}
        </article>

        {/* Timeline */}
        {payment.timeline && payment.timeline.length > 0 && (
          <article style={{ background: '#111827', borderRadius: 12, padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Timeline
            </h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {payment.timeline.map((event, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 10, padding: '8px 12px', background: '#0f172a', borderRadius: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8', marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <div style={{ color: '#e2e8f0', fontSize: 13 }}>{event.event}</div>
                    <div style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>
                      {event.at ? fmtDate(event.at) : ''}{event.by ? ` · by ${event.by}` : ''}
                    </div>
                    {event.note && <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{event.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          </article>
        )}
      </div>

      {/* Operator actions */}
      {isActionable && (
        <article style={{ background: '#111827', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Operator Actions
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <form action={adminMarkPaidAction} style={{ display: 'grid', gap: 8, background: '#0a2420', border: '1px solid #134e3044', borderRadius: 10, padding: 16 }}>
              <input type="hidden" name="paymentId" value={payment.id} />
              <div style={{ fontSize: 12, fontWeight: 700, color: '#34d399' }}>✅ Mark as Paid</div>
              <input name="proofUrl" placeholder="Proof URL (optional)" defaultValue={payment.proofUrl ?? ''} style={{ fontSize: 13 }} />
              <input name="note" placeholder="Internal note (optional)" style={{ fontSize: 13 }} />
              <button type="submit" style={{ background: '#15803d', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Confirm Payment
              </button>
            </form>

            <form action={adminRejectPaymentAction} style={{ display: 'grid', gap: 8, background: '#200a0a', border: '1px solid #4e131344', borderRadius: 10, padding: 16 }}>
              <input type="hidden" name="paymentId" value={payment.id} />
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f87171' }}>❌ Reject</div>
              <input name="reason" placeholder="Reason for rejection" style={{ fontSize: 13 }} />
              <button type="submit" style={{ background: '#7f1d1d', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Reject Payment
              </button>
            </form>

            <form action={adminRequestCorrectionAction} style={{ display: 'grid', gap: 8, background: '#0f1520', border: '1px solid #1e3a6044', borderRadius: 10, padding: 16 }}>
              <input type="hidden" name="paymentId" value={payment.id} />
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>🔄 Request Correction</div>
              <input name="message" placeholder="Message to buyer" style={{ fontSize: 13 }} />
              <button type="submit" style={{ background: '#78350f', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Request Correction
              </button>
            </form>

            <form action={adminUploadProofAction} style={{ display: 'grid', gap: 8, background: '#0a0f20', border: '1px solid #1e2a5044', borderRadius: 10, padding: 16 }}>
              <input type="hidden" name="paymentId" value={payment.id} />
              <div style={{ fontSize: 12, fontWeight: 700, color: '#818cf8' }}>📎 Upload Proof</div>
              <input name="proofUrl" placeholder="Proof document URL" required style={{ fontSize: 13 }} />
              <input name="note" placeholder="Note (optional)" style={{ fontSize: 13 }} />
              <button type="submit" style={{ background: '#3730a3', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Upload Proof
              </button>
            </form>
          </div>
        </article>
      )}

      {!isActionable && (
        <div style={{ background: '#111827', borderRadius: 12, padding: 20, color: '#475569', fontSize: 13, textAlign: 'center' }}>
          This payment is in <strong style={{ color: statusCol }}>{payment.status}</strong> status — no further operator actions available.
        </div>
      )}
    </section>
  );
}
