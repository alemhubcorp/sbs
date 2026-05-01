import Link from 'next/link';
import { requireAccessToken } from '../../lib/auth';

export const dynamic = 'force-dynamic';

const internalBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

async function fetchJson<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${internalBaseUrl}${path}`, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: 'no-store'
  });
  if (!response.ok) throw new Error(`${path} → ${response.status}`);
  return (await response.json()) as T;
}

type Payment = {
  id: string;
  status: string;
  flow: string;
  currency: string;
  totalAmountMinor: number;
  buyerProfile?: { id: string; displayName?: string };
  supplierProfile?: { id: string; displayName?: string };
  deal?: { id: string; title?: string };
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
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default async function PaymentsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const accessToken = await requireAccessToken('/payments');
  const sp = (await searchParams) ?? {};
  const statusFilter = typeof sp.status === 'string' ? sp.status : '';
  const success = typeof sp.success === 'string' ? sp.success : '';

  let payments: Payment[] = [];
  let reviewCount = 0;
  let error: string | null = null;

  try {
    const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
    const result = await fetchJson<{ items: Payment[] } | Payment[]>(`/api/admin/payments${qs}`, accessToken);
    payments = Array.isArray(result) ? result : (result.items ?? []);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load payments';
  }

  try {
    const reviewResult = await fetchJson<{ items: Payment[] } | Payment[]>('/api/admin/payments/review', accessToken);
    const reviewItems = Array.isArray(reviewResult) ? reviewResult : (reviewResult.items ?? []);
    reviewCount = reviewItems.length;
  } catch {
    reviewCount = 0;
  }

  const statuses = ['', 'pending', 'needs_review', 'paid', 'rejected', 'released', 'refunded'];

  return (
    <section style={{ padding: 24, display: 'grid', gap: 20 }}>
      <style>{`
        .pm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .pm-table th { text-align: left; padding: 8px 10px; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; border-bottom: 1px solid #1e293b; }
        .pm-table td { padding: 10px 10px; border-bottom: 1px solid #0f172a; vertical-align: middle; }
        .pm-table tr:hover td { background: rgba(255,255,255,0.02); }
        .pm-badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; }
        .pm-link { color: #818cf8; text-decoration: none; }
        .pm-link:hover { text-decoration: underline; }
      `}</style>

      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Payments</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            All payment transactions across the platform
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link
            href="/payments/review"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: reviewCount > 0 ? '#f97316' : '#374151',
              color: '#fff', padding: '8px 14px', borderRadius: 8, textDecoration: 'none',
              fontSize: 13, fontWeight: 600
            }}
          >
            🔍 Review Queue
            {reviewCount > 0 && (
              <span style={{ background: '#fff', color: '#f97316', borderRadius: 99, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>
                {reviewCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {success && (
        <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 8, padding: '10px 14px', color: '#34d399', fontSize: 13 }}>
          ✅ {decodeURIComponent(success)}
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {(['pending', 'needs_review', 'paid', 'rejected'] as const).map((s) => {
          const count = payments.filter((p) => p.status === s).length;
          return (
            <Link
              key={s}
              href={`/payments?status=${s}`}
              style={{
                display: 'block', background: '#111827', borderRadius: 10, padding: '14px 16px',
                textDecoration: 'none', border: `1px solid ${statusFilter === s ? statusColor[s] ?? '#374151' : '#1e293b'}`
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 700, color: statusColor[s] ?? '#e2e8f0' }}>{count}</div>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
                {s.replace(/_/g, ' ')}
              </div>
            </Link>
          );
        })}
        <Link
          href="/payments"
          style={{
            display: 'block', background: '#111827', borderRadius: 10, padding: '14px 16px',
            textDecoration: 'none', border: `1px solid ${!statusFilter ? '#818cf8' : '#1e293b'}`
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0' }}>{payments.length}</div>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>Total shown</div>
        </Link>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {statuses.map((s) => (
          <Link
            key={s || 'all'}
            href={s ? `/payments?status=${s}` : '/payments'}
            style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              textDecoration: 'none',
              background: statusFilter === s ? (statusColor[s] ?? '#818cf8') : '#1e293b',
              color: statusFilter === s ? '#fff' : '#94a3b8'
            }}
          >
            {s || 'All'}
          </Link>
        ))}
      </div>

      {/* Payments table */}
      <article style={{ background: '#111827', borderRadius: 12, overflow: 'hidden' }}>
        {payments.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#475569' }}>
            No payments found{statusFilter ? ` with status "${statusFilter}"` : ''}.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="pm-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Flow</th>
                  <th>Amount</th>
                  <th>Buyer</th>
                  <th>Supplier</th>
                  <th>Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'monospace', color: '#94a3b8', fontSize: 11 }}>
                      {p.id.slice(0, 8)}…
                    </td>
                    <td>
                      <span
                        className="pm-badge"
                        style={{
                          background: `${statusColor[p.status] ?? '#94a3b8'}22`,
                          color: statusColor[p.status] ?? '#94a3b8'
                        }}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: 12 }}>{p.flow ?? '—'}</td>
                    <td style={{ fontWeight: 600, color: '#f1f5f9' }}>
                      {fmt(p.totalAmountMinor ?? 0, p.currency ?? 'USD')}
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: 12 }}>
                      {p.buyerProfile?.displayName ?? p.buyerProfile?.id?.slice(0, 8) ?? '—'}
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: 12 }}>
                      {p.supplierProfile?.displayName ?? p.supplierProfile?.id?.slice(0, 8) ?? '—'}
                    </td>
                    <td style={{ color: '#64748b', fontSize: 12 }}>{p.updatedAt ? fmtDate(p.updatedAt) : '—'}</td>
                    <td>
                      <Link href={`/payments/${p.id}`} className="pm-link" style={{ fontSize: 12 }}>
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
