'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { MarketplaceRole } from '../lib/marketplace-viewer';
import { formatDateTime, formatMoney, paymentStatusLabel } from './finance-utils';
import styles from './core-flow.module.css';

type DashboardData = {
  orders: any[];
  deals: any[];
  transactions: any[];
  adminPayments: any[];
  auditEvents: any[];
  assignments: any[];
};

function statusTone(status: string) {
  if (['paid', 'released', 'completed'].includes(status)) {
    return `${styles.status} ${styles.statusSuccess}`;
  }

  if (['failed', 'cancelled', 'refunded', 'payout_failed'].includes(status)) {
    return `${styles.status} ${styles.statusError}`;
  }

  return `${styles.status} ${styles.statusWarning}`;
}

export function DashboardOverviewClient({ role }: { role: MarketplaceRole }) {
  const [data, setData] = useState<DashboardData>({ orders: [], deals: [], transactions: [], adminPayments: [], auditEvents: [], assignments: [] });
  const [loading, setLoading] = useState(role !== 'guest');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (role === 'guest') {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [ordersResponse, dealsResponse, transactionsResponse, assignmentsResponse, adminPaymentsResponse, auditResponse] = await Promise.all([
          role === 'buyer' || role === 'supplier' || role === 'admin' ? fetch('/api/retail/orders', { cache: 'no-store' }) : Promise.resolve(null),
          role === 'buyer' || role === 'supplier' || role === 'admin' ? fetch('/api/contract/deals', { cache: 'no-store' }) : Promise.resolve(null),
          role === 'supplier' || role === 'admin' ? fetch('/api/payments/transactions', { cache: 'no-store' }) : Promise.resolve(null),
          role === 'logistics' || role === 'customs'
            ? fetch(`/api/partner-ops/assignments?kind=${role === 'logistics' ? 'shipment' : 'customs'}`, { cache: 'no-store' })
            : Promise.resolve(null),
          role === 'admin' ? fetch('/api/admin/payments?limit=5', { cache: 'no-store' }) : Promise.resolve(null),
          role === 'admin' ? fetch('/api/audit/events?limit=5', { cache: 'no-store' }) : Promise.resolve(null)
        ]);
        const assignmentsJson = assignmentsResponse?.ok ? await assignmentsResponse.json() : null;
        const adminPaymentsJson = adminPaymentsResponse?.ok ? await adminPaymentsResponse.json() : null;
        const auditJson = auditResponse?.ok ? await auditResponse.json() : null;

        const next: DashboardData = {
          orders: ordersResponse?.ok ? ((await ordersResponse.json()) as any[]) : [],
          deals: dealsResponse?.ok ? ((await dealsResponse.json()) as any[]) : [],
          transactions: transactionsResponse?.ok ? ((await transactionsResponse.json()) as any[]) : [],
          assignments: assignmentsJson && typeof assignmentsJson === 'object' && 'items' in assignmentsJson ? ((assignmentsJson as { items?: any[] }).items ?? []) : [],
          adminPayments: adminPaymentsJson && typeof adminPaymentsJson === 'object' && 'items' in adminPaymentsJson ? ((adminPaymentsJson as { items?: any[] }).items ?? []) : [],
          auditEvents: auditJson && typeof auditJson === 'object' && 'items' in auditJson ? ((auditJson as { items?: any[] }).items ?? []) : []
        };

        if (!cancelled) {
          setData(next);
        }
      } catch (failure) {
        if (!cancelled) {
          setError(failure instanceof Error ? failure.message : 'Unable to load dashboard summary.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    const interval = setInterval(() => {
      void load();
    }, 20_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [role]);

  const buyerSummary = useMemo(() => {
    const orders = data.orders.slice(0, 3);
    const deals = data.deals.filter((deal) => !['completed', 'cancelled'].includes(deal.dealStatus)).slice(0, 3);
    const paymentRecords = [...data.orders.flatMap((order) => order.paymentRecords ?? []), ...data.deals.flatMap((deal) => deal.paymentRecords ?? [])];
    const sortedPayments = [...paymentRecords].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    const pending = paymentRecords.filter((record) => ['pending', 'processing', 'awaiting_transfer', 'awaiting_confirmation', 'requires_review'].includes(record.status));
    return { orders, deals, pending, lastStatus: sortedPayments[0]?.status ?? null };
  }, [data.orders, data.deals]);

  const supplierSummary = useMemo(() => {
    const transactions = data.transactions;
    const dealStatusMap = new Map(data.deals.map((deal) => [deal.id, deal.dealStatus]));
    const currency = transactions[0]?.currency ?? 'USD';
    const held = transactions.filter((transaction) => ['held', 'partially_released'].includes(transaction.status));
    const released = transactions.filter((transaction) => transaction.status === 'released');
    const releasable = transactions.filter((transaction) => ['held', 'partially_released'].includes(transaction.status) && ['completed'].includes(dealStatusMap.get(transaction.dealId) ?? ''));
    const shipmentsPending = data.deals.filter((deal) => ['accepted', 'in_escrow'].includes(deal.dealStatus));
    return { held, released, releasable, deals: data.deals.slice(0, 3), shipmentsPending, currency };
  }, [data.transactions, data.deals]);

  const adminSummary = useMemo(() => {
    const payments = data.adminPayments;
    const review = payments.filter((payment) => payment.reviewState === 'needs_review');
    return { payments: payments.slice(0, 5), review, total: payments.length, auditEvents: data.auditEvents.slice(0, 5) };
  }, [data.adminPayments, data.auditEvents]);

  const partnerSummary = useMemo(() => {
    const assignments = data.assignments;
    const statusCounts = assignments.reduce<Record<string, number>>((acc, assignment) => {
      const key = assignment.status ?? 'unknown';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    return {
      assignments: assignments.slice(0, 5),
      total: assignments.length,
      statusCounts
    };
  }, [data.assignments]);

  if (loading) {
    return <div className={styles.emptyState}>Loading dashboard overview...</div>;
  }

  if (error) {
    return <div className={styles.errorBox}>{error}</div>;
  }

  if (role === 'guest') {
    return (
      <div className={styles.sectionCard}>
        <div className={styles.sectionTitle}>Start with access.</div>
        <div className={styles.subtle}>Sign in to see role-aware payments, payouts, and deal activity.</div>
        <div className={styles.buttonRow} style={{ marginTop: 12 }}>
          <Link href="/signin?returnTo=/dashboard" className={styles.button}>
            Sign In
          </Link>
          <Link href="/register" className={styles.buttonSecondary}>
            Register
          </Link>
        </div>
      </div>
    );
  }

  if (role === 'buyer') {
    return (
      <div className={styles.stack}>
        <div className={styles.cardGrid}>
          <div className={styles.card}>
            <div className={styles.sectionTitle}>Recent orders</div>
            <div className={styles.stack}>
              {buyerSummary.orders.length ? (
                buyerSummary.orders.map((order) => (
                  <div key={order.id} className={styles.row}>
                    <span className={styles.label}>#{order.id.slice(0, 8)}</span>
                    <span>{formatMoney(order.totalAmountMinor, order.currency)}</span>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>No orders yet.</div>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.sectionTitle}>Active deals</div>
            <div className={styles.stack}>
              {buyerSummary.deals.length ? (
                buyerSummary.deals.map((deal) => (
                  <div key={deal.id} className={styles.row}>
                    <span className={styles.label}>#{deal.id.slice(0, 8)}</span>
                    <span>{deal.dealStatus}</span>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>No active deals.</div>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.sectionTitle}>Pending actions</div>
            <div className={styles.inlineMeta}>
              <span>Pay / confirm: {buyerSummary.pending.length}</span>
              <span>Last payment: {paymentStatusLabel(buyerSummary.lastStatus)}</span>
            </div>
            <div className={styles.buttonRow} style={{ marginTop: 12 }}>
              <Link href="/buyer/payments" className={styles.buttonSecondary}>
                Payments dashboard
              </Link>
              <Link href="/orders" className={styles.button}>
                Orders
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (role === 'supplier') {
    return (
      <div className={styles.stack}>
        <div className={styles.cardGrid}>
          <div className={styles.card}>
            <div className={styles.sectionTitle}>Earnings summary</div>
            <div className={styles.inlineMeta}>
              <span>Held: {formatMoney(supplierSummary.held.reduce((total, transaction) => total + transaction.heldAmountMinor, 0), supplierSummary.currency)}</span>
              <span>Releasable: {formatMoney(supplierSummary.releasable.reduce((total, transaction) => total + transaction.heldAmountMinor, 0), supplierSummary.currency)}</span>
              <span>Paid: {formatMoney(supplierSummary.released.reduce((total, transaction) => total + transaction.releasedAmountMinor, 0), supplierSummary.currency)}</span>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.sectionTitle}>Recent deals</div>
            <div className={styles.stack}>
              {supplierSummary.deals.length ? (
                supplierSummary.deals.map((deal) => (
                  <div key={deal.id} className={styles.row}>
                    <span className={styles.label}>#{deal.id.slice(0, 8)}</span>
                    <span className={statusTone(deal.dealStatus)}>{deal.dealStatus}</span>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>No deals yet.</div>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.sectionTitle}>Payout alerts</div>
            <div className={styles.subtle}>
              {supplierSummary.releasable.length ? `${supplierSummary.releasable.length} payout(s) ready for release.` : 'No payout alerts right now.'}
            </div>
            <div className={styles.inlineMeta} style={{ marginTop: 10 }}>
              <span>Shipments pending: {supplierSummary.shipmentsPending.length}</span>
            </div>
            <div className={styles.buttonRow} style={{ marginTop: 12 }}>
              <Link href="/supplier/payouts" className={styles.buttonSecondary}>
                Payouts
              </Link>
              <Link href="/supplier/payout-settings" className={styles.button}>
                Payout settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (role === 'logistics' || role === 'customs') {
    const title = role === 'logistics' ? 'Logistics operations' : 'Customs operations';
    const emptyMessage = role === 'logistics' ? 'No shipments assigned yet.' : 'No customs cases assigned yet.';
    const destination = role === 'logistics' ? '/logistics' : '/customs';

    return (
      <div className={styles.stack}>
        <div className={styles.cardGrid}>
          <div className={styles.card}>
            <div className={styles.sectionTitle}>{title}</div>
            <div className={styles.inlineMeta}>
              <span>Assignments: {partnerSummary.total}</span>
              <span>
                {Object.entries(partnerSummary.statusCounts).map(([key, value]) => `${key}: ${value}`).join(' · ') || 'No active assignments'}
              </span>
            </div>
            <div className={styles.buttonRow} style={{ marginTop: 12 }}>
              <Link href={destination} className={styles.buttonSecondary}>
                Open cabinet
              </Link>
              <Link href="/notifications" className={styles.button}>
                Notifications
              </Link>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.sectionTitle}>{role === 'logistics' ? 'Assigned shipments' : 'Assigned customs cases'}</div>
            <div className={styles.stack}>
              {partnerSummary.assignments.length ? (
                partnerSummary.assignments.map((assignment) => (
                  <div key={assignment.id} className={styles.row}>
                    <span className={styles.label}>#{assignment.reference ?? assignment.id.slice(0, 8)}</span>
                    <span className={statusTone(assignment.status)}>{assignment.status}</span>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>{emptyMessage}</div>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.sectionTitle}>Notifications</div>
            <div className={styles.subtle}>Assignment changes and lifecycle updates appear in-app and stay visible in the cabinet.</div>
            <div className={styles.buttonRow} style={{ marginTop: 12 }}>
              <Link href="/notifications" className={styles.buttonSecondary}>
                Open notifications
              </Link>
              <Link href={destination} className={styles.button}>
                View board
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.stack}>
      <div className={styles.cardGrid}>
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Payment operations</div>
          <div className={styles.subtle}>Review payments, webhooks, and manual reconciliation from one place.</div>
          <div className={styles.buttonRow} style={{ marginTop: 12 }}>
            <Link href="/admin/payments" className={styles.buttonSecondary}>
              Payment ledger
            </Link>
            <Link href="/admin/payments/review" className={styles.button}>
              Review queue
            </Link>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionTitle}>Recent activity</div>
          <div className={styles.stack}>
            {adminSummary.payments.length ? (
              adminSummary.payments.map((payment) => (
                <div key={payment.id} className={styles.row}>
                  <span className={styles.label}>#{payment.id.slice(0, 8)}</span>
                  <span>{paymentStatusLabel(payment.status)}</span>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>No payments yet.</div>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionTitle}>Audit trail</div>
          <div className={styles.stack}>
            {adminSummary.auditEvents.length ? (
              adminSummary.auditEvents.map((event: any) => (
                <div key={event.id} className={styles.row}>
                  <span className={styles.label}>{formatDateTime(event.createdAt)}</span>
                  <span>{event.eventType ?? event.action ?? 'event'}</span>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>No audit events yet.</div>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionTitle}>Review queue</div>
          <div className={styles.inlineMeta}>
            <span>Review required: {adminSummary.review.length}</span>
            <span>Total payments: {adminSummary.total}</span>
          </div>
          <div className={styles.buttonRow} style={{ marginTop: 12 }}>
            <Link href="/admin/api-connections" className={styles.buttonSecondary}>
              Providers
            </Link>
            <Link href="/admin/api-connections/banks" className={styles.button}>
              Banks
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
