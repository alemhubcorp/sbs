import Link from 'next/link';
import { requireAccessToken } from '../../../lib/auth';
import { adminMarkPaidAction, adminRejectPaymentAction, adminRequestCorrectionAction } from '../../actions';

export const dynamic = 'force-dynamic';

const internalBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

type Payment = {
  id: string;
  status: string;
  flow: string;
  currency: string;
  totalAmountMinor: number;
  buyerProfile?: { id: string; displayName?: string };
  supplierProfile?: { id: string; displayName?: string };
  deal?: { id: string; title?: string };
  proofUrl?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

function fmt(minor: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(minor / 100);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default async function PaymentsReviewPage() {
  const accessToken = await requireAccessToken('/payments/review');

  let items: Payment[] = [];
  let error: string | null = null;

  try {
    const response = await fetch(`${internalBaseUrl}/api/admin/payments/review`, {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const result = (await response.json()) as { items: Payment[] } | Payment[];
    items = Array.isArray(result) ? result : (result.items ?? []);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load review queue';
  }

  return (
    <section style={{ padding: 24, display: 'grid', gap: 20 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/payments" style={{ color: '#64748b', textDecoration: 'none', fontSize: 13 }}>← Payments</Link>
          </div>
          <h1 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>
            Review Queue
            {items.length > 0 && (
              <span style={{ marginLeft: 10, background: '#f97316', color: '#fff', borderRadius: 99, padding: '2px 10px', fontSize: 14 }}>
                {items.length}
              </span>
            )}
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            Payments requiring operator action
          </p>
        </div>
      </header>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      {items.length === 0 && !error ? (
        <div style={{ background: '#111827', borderRadius: 12, padding: 40, textAlign: 'center', color: '#475569' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#94a3b8' }}>All clear</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>No payments need review right now.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {items.map((p) => (
            <article key={p.id} style={{ background: '#111827', borderRadius: 12, padding: 20, border: '1px solid #f9741644' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ background: '#f9741622', color: '#f97316', borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                      {p.status}
                    </span>
                    <span style={{ color: '#64748b', fontSize: 12 }}>{p.flow ?? '—'}</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginTop: 6 }}>
                    {fmt(p.totalAmountMinor ?? 0, p.currency ?? 'USD')}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                    ID: <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{p.id}</span>
                  </div>
                </div>
                <Link
                  href={`/payments/${p.id}`}
                  style={{ color: '#818cf8', fontSize: 13, textDecoration: 'none' }}
                >
                  Full detail →
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
                <div style={{ background: '#0f172a', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Buyer</div>
                  <div style={{ color: '#e2e8f0', fontSize: 13, marginTop: 2 }}>
                    {p.buyerProfile?.displayName ?? p.buyerProfile?.id ?? '—'}
                  </div>
                </div>
                <div style={{ background: '#0f172a', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Supplier</div>
                  <div style={{ color: '#e2e8f0', fontSize: 13, marginTop: 2 }}>
                    {p.supplierProfile?.displayName ?? p.supplierProfile?.id ?? '—'}
                  </div>
                </div>
                <div style={{ background: '#0f172a', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Updated</div>
                  <div style={{ color: '#e2e8f0', fontSize: 13, marginTop: 2 }}>
                    {p.updatedAt ? fmtDate(p.updatedAt) : '—'}
                  </div>
                </div>
              </div>

              {p.proofUrl && (
                <div style={{ marginBottom: 12, padding: '8px 12px', background: '#0f172a', borderRadius: 8, fontSize: 13 }}>
                  📎 Proof: <a href={p.proofUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8' }}>{p.proofUrl}</a>
                </div>
              )}

              {/* Action forms */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <form action={adminMarkPaidAction} style={{ display: 'grid', gap: 6, background: '#0a2420', border: '1px solid #134e3022', borderRadius: 8, padding: 12 }}>
                  <input type="hidden" name="paymentId" value={p.id} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mark Paid</div>
                  <input name="proofUrl" placeholder="Proof URL (optional)" style={{ fontSize: 12 }} />
                  <input name="note" placeholder="Note (optional)" style={{ fontSize: 12 }} />
                  <button type="submit" style={{ background: '#15803d', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    ✅ Mark as Paid
                  </button>
                </form>

                <form action={adminRejectPaymentAction} style={{ display: 'grid', gap: 6, background: '#200a0a', border: '1px solid #4e131322', borderRadius: 8, padding: 12 }}>
                  <input type="hidden" name="paymentId" value={p.id} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Reject</div>
                  <input name="reason" placeholder="Rejection reason (optional)" style={{ fontSize: 12 }} />
                  <button type="submit" style={{ background: '#7f1d1d', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    ❌ Reject Payment
                  </button>
                </form>

                <form action={adminRequestCorrectionAction} style={{ display: 'grid', gap: 6, background: '#0f1520', border: '1px solid #1e2a4022', borderRadius: 8, padding: 12 }}>
                  <input type="hidden" name="paymentId" value={p.id} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Request Correction</div>
                  <input name="message" placeholder="Message to buyer (optional)" style={{ fontSize: 12 }} />
                  <button type="submit" style={{ background: '#78350f', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    🔄 Request Correction
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
