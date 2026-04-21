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

function shortId(value?: string | null) {
  return value ? `#${value.slice(0, 8)}` : '#pending';
}

export function DashboardOverviewClient({ role }: { role: MarketplaceRole }) {
  const currentRole = role as string;
  const [data, setData] = useState<DashboardData>({ orders: [], deals: [], transactions: [], adminPayments: [], auditEvents: [], assignments: [] });
  const [loading, setLoading] = useState(role !== 'guest');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (role === 'guest') {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const assignmentKind = currentRole === 'logistics' ? 'shipment' : currentRole === 'customs' ? 'customs' : null;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [ordersResponse, dealsResponse, transactionsResponse, assignmentsResponse, adminPaymentsResponse, auditResponse] = await Promise.all([
          currentRole === 'buyer' || currentRole === 'supplier' || currentRole === 'admin'
            ? fetch('/api/retail/orders', { cache: 'no-store' })
            : Promise.resolve(null),
          currentRole === 'buyer' || currentRole === 'supplier' || currentRole === 'admin'
            ? fetch('/api/contract/deals', { cache: 'no-store' })
            : Promise.resolve(null),
          currentRole === 'supplier' || currentRole === 'admin' ? fetch('/api/payments/transactions', { cache: 'no-store' }) : Promise.resolve(null),
          assignmentKind
            ? fetch(`/api/partner-ops/assignments?kind=${assignmentKind}`, { cache: 'no-store' })
            : Promise.resolve(null),
          currentRole === 'admin' ? fetch('/api/admin/payments?limit=5', { cache: 'no-store' }) : Promise.resolve(null),
          currentRole === 'admin' ? fetch('/api/audit/events?limit=5', { cache: 'no-store' }) : Promise.resolve(null)
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

  if (currentRole === 'guest') {
    return (
      <div className={`${styles.heroPanel} ${styles.heroPanelCompact}`}>
        <div className={styles.heroHeading}>
          <div className={styles.sectionEyebrow}>Guest dashboard</div>
          <h2 className={styles.heroTitle}>Access turns the marketplace into an operating console.</h2>
          <p className={styles.heroDescription}>Sign in to unlock role-aware payments, deal tracking, logistics visibility, and supplier payout surfaces.</p>
        </div>
        <div className={styles.metricGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Buyer flow</div>
            <div className={styles.metricValue}>RFQ to escrow</div>
            <div className={styles.metricHint}>Requests, quotes, deals, checkout, and order follow-up live in one cabinet.</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Supplier flow</div>
            <div className={styles.metricValue}>Quotes to payout</div>
            <div className={styles.metricHint}>Suppliers keep deal status, release readiness, and payout settings in sync.</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Operator flow</div>
            <div className={styles.metricValue}>Logistics and customs</div>
            <div className={styles.metricHint}>Partners stay on dedicated live routes without leaving the production domain.</div>
          </div>
        </div>
        <div className={styles.buttonRow}>
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

  if (currentRole === 'buyer') {
    return (
      <div className={styles.stack}>
        <div className={styles.heroPanel}>
          <div className={styles.heroHeading}>
            <div className={styles.sectionEyebrow}>Buyer command view</div>
            <h2 className={styles.heroTitle}>Track requests, active deals, and payment actions from one buyer workspace.</h2>
            <p className={styles.heroDescription}>This overview keeps current order load, live deals, and the next escrow-linked payment steps visible without switching surfaces.</p>
          </div>
          <div className={styles.metricGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Orders</div>
              <div className={styles.metricValue}>{data.orders.length}</div>
              <div className={styles.metricHint}>Retail orders currently in your cabinet.</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Active deals</div>
              <div className={styles.metricValue}>{buyerSummary.deals.length}</div>
              <div className={styles.metricHint}>Deal rooms still moving toward completion.</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Pending actions</div>
              <div className={styles.metricValue}>{buyerSummary.pending.length}</div>
              <div className={styles.metricHint}>Payments or confirmations still waiting on buyer action.</div>
            </div>
          </div>
        </div>
        <div className={styles.cardGrid}>
          <div className={styles.card}>
            <div className={styles.sectionEyebrow}>Orders</div>
            <div className={styles.sectionTitle}>Recent orders</div>
            <div className={styles.stack}>
              {buyerSummary.orders.length ? (
                buyerSummary.orders.map((order) => (
                  <div key={order.id} className={styles.listCard}>
                    <div className={styles.listHead}>
                      <span className={styles.label}>{shortId(order.id)}</span>
                      <span className={styles.listValue}>{formatMoney(order.totalAmountMinor, order.currency)}</span>
                    </div>
                    <div className={styles.listMeta}>
                      <span>Status: {order.status ?? 'pending'}</span>
                      {order.createdAt ? <span>{formatDateTime(order.createdAt)}</span> : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>No orders yet.</div>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.sectionEyebrow}>Deals</div>
            <div className={styles.sectionTitle}>Active deals</div>
            <div className={styles.stack}>
              {buyerSummary.deals.length ? (
                buyerSummary.deals.map((deal) => (
                  <div key={deal.id} className={styles.listCard}>
                    <div className={styles.listHead}>
                      <span className={styles.label}>{shortId(deal.id)}</span>
                      <span className={statusTone(deal.dealStatus ?? 'pending')}>{deal.dealStatus ?? 'pending'}</span>
                    </div>
                    <div className={styles.listMeta}>
                      {deal.updatedAt ? <span>Updated {formatDateTime(deal.updatedAt)}</span> : null}
                      {deal.paymentMethod ? <span>Rail: {deal.paymentMethod}</span> : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>No active deals.</div>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.sectionEyebrow}>Actions</div>
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

  if (currentRole === 'supplier') {
    return (
      <div className={styles.stack}>
        <div className={styles.heroPanel}>
          <div className={styles.heroHeading}>
            <div className={styles.sectionEyebrow}>Supplier command view</div>
            <h2 className={styles.heroTitle}>Keep earnings, live deals, and release readiness visible in one supplier board.</h2>
            <p className={styles.heroDescription}>The supplier overview emphasizes held capital, payout readiness, and deal momentum without changing any settlement logic.</p>
          </div>
          <div className={styles.metricGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Held</div>
              <div className={styles.metricValue}>
                {formatMoney(supplierSummary.held.reduce((total, transaction) => total + transaction.heldAmountMinor, 0), supplierSummary.currency)}
              </div>
              <div className={styles.metricHint}>Funds currently protected inside escrow.</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Releasable</div>
              <div className={styles.metricValue}>
                {formatMoney(supplierSummary.releasable.reduce((total, transaction) => total + transaction.heldAmountMinor, 0), supplierSummary.currency)}
              </div>
              <div className={styles.metricHint}>Payout volume eligible once completion conditions are satisfied.</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Pending shipments</div>
              <div className={styles.metricValue}>{supplierSummary.shipmentsPending.length}</div>
              <div className={styles.metricHint}>Accepted or escrow-funded deals waiting on fulfillment progress.</div>
            </div>
          </div>
        </div>
        <div className={styles.cardGrid}>
          <div className={styles.card}>
            <div className={styles.sectionEyebrow}>Earnings</div>
            <div className={styles.sectionTitle}>Earnings summary</div>
            <div className={styles.inlineMeta}>
              <span>Held: {formatMoney(supplierSummary.held.reduce((total, transaction) => total + transaction.heldAmountMinor, 0), supplierSummary.currency)}</span>
              <span>Releasable: {formatMoney(supplierSummary.releasable.reduce((total, transaction) => total + transaction.heldAmountMinor, 0), supplierSummary.currency)}</span>
              <span>Paid: {formatMoney(supplierSummary.released.reduce((total, transaction) => total + transaction.releasedAmountMinor, 0), supplierSummary.currency)}</span>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.sectionEyebrow}>Deal flow</div>
            <div className={styles.sectionTitle}>Recent deals</div>
            <div className={styles.stack}>
              {supplierSummary.deals.length ? (
                supplierSummary.deals.map((deal) => (
                  <div key={deal.id} className={styles.listCard}>
                    <div className={styles.listHead}>
                      <span className={styles.label}>{shortId(deal.id)}</span>
                      <span className={statusTone(deal.dealStatus ?? 'pending')}>{deal.dealStatus ?? 'pending'}</span>
                    </div>
                    <div className={styles.listMeta}>
                      {deal.updatedAt ? <span>Updated {formatDateTime(deal.updatedAt)}</span> : null}
                      {deal.deliveryStatus ? <span>Delivery: {deal.deliveryStatus}</span> : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>No deals yet.</div>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.sectionEyebrow}>Release control</div>
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

  if (currentRole === 'logistics' || currentRole === 'customs') {
    const title = currentRole === 'logistics' ? 'Logistics operations' : 'Customs operations';
    const emptyMessage = currentRole === 'logistics' ? 'No shipments assigned yet.' : 'No customs cases assigned yet.';
    const destination = currentRole === 'logistics' ? '/logistics' : '/customs';

    return (
      <div className={styles.stack}>
        <div className={styles.heroPanel}>
          <div className={styles.heroHeading}>
            <div className={styles.sectionEyebrow}>{currentRole === 'logistics' ? 'Logistics command view' : 'Customs command view'}</div>
            <h2 className={styles.heroTitle}>{currentRole === 'logistics' ? 'Assigned shipment work stays visible and current.' : 'Assigned customs cases stay visible and action-ready.'}</h2>
            <p className={styles.heroDescription}>
              {currentRole === 'logistics'
                ? 'Use this overview to track workload, active statuses, and handoff points before opening the detailed logistics board.'
                : 'Use this overview to monitor case status, document pressure, and broker follow-up before opening the detailed customs board.'}
            </p>
          </div>
          <div className={styles.metricGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Assignments</div>
              <div className={styles.metricValue}>{partnerSummary.total}</div>
              <div className={styles.metricHint}>Current items assigned to this operator role.</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Status spread</div>
              <div className={styles.metricValue}>{Object.keys(partnerSummary.statusCounts).length || 0}</div>
              <div className={styles.metricHint}>Distinct lifecycle states currently represented in the queue.</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Next action</div>
              <div className={styles.metricValue}>{partnerSummary.assignments[0]?.status ?? 'clear'}</div>
              <div className={styles.metricHint}>Top visible status from the current assignment list.</div>
            </div>
          </div>
        </div>
        <div className={styles.cardGrid}>
          <div className={styles.card}>
            <div className={styles.sectionEyebrow}>Load</div>
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
            <div className={styles.sectionEyebrow}>{currentRole === 'logistics' ? 'Shipments' : 'Cases'}</div>
            <div className={styles.sectionTitle}>{currentRole === 'logistics' ? 'Assigned shipments' : 'Assigned customs cases'}</div>
            <div className={styles.stack}>
              {partnerSummary.assignments.length ? (
                partnerSummary.assignments.map((assignment) => (
                  <div key={assignment.id} className={styles.listCard}>
                    <div className={styles.listHead}>
                      <span className={styles.label}>#{assignment.reference ?? assignment.id.slice(0, 8)}</span>
                      <span className={statusTone(assignment.status ?? 'pending')}>{assignment.status ?? 'pending'}</span>
                    </div>
                    <div className={styles.listMeta}>
                      {assignment.createdAt ? <span>{formatDateTime(assignment.createdAt)}</span> : null}
                      {assignment.organizationName ? <span>{assignment.organizationName}</span> : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>{emptyMessage}</div>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.sectionEyebrow}>Signals</div>
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
      <div className={styles.heroPanel}>
        <div className={styles.heroHeading}>
          <div className={styles.sectionEyebrow}>Admin overview</div>
          <h2 className={styles.heroTitle}>Control payment review, audit activity, and provider readiness from one executive surface.</h2>
          <p className={styles.heroDescription}>This admin summary highlights payment review pressure and recent system activity without changing the current control plane workflow.</p>
        </div>
        <div className={styles.metricGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Payments</div>
            <div className={styles.metricValue}>{adminSummary.total}</div>
            <div className={styles.metricHint}>Admin payment records currently visible in the review surface.</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Needs review</div>
            <div className={styles.metricValue}>{adminSummary.review.length}</div>
            <div className={styles.metricHint}>Items still waiting for manual decisioning.</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Audit events</div>
            <div className={styles.metricValue}>{adminSummary.auditEvents.length}</div>
            <div className={styles.metricHint}>Recent operational and system traces available in the audit feed.</div>
          </div>
        </div>
      </div>
      <div className={styles.cardGrid}>
        <div className={styles.card}>
          <div className={styles.sectionEyebrow}>Payments</div>
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
          <div className={styles.sectionEyebrow}>Recent activity</div>
          <div className={styles.sectionTitle}>Recent activity</div>
          <div className={styles.stack}>
            {adminSummary.payments.length ? (
              adminSummary.payments.map((payment) => (
                <div key={payment.id} className={styles.listCard}>
                  <div className={styles.listHead}>
                    <span className={styles.label}>{shortId(payment.id)}</span>
                    <span className={statusTone(payment.status ?? 'pending')}>{paymentStatusLabel(payment.status)}</span>
                  </div>
                  <div className={styles.listMeta}>
                    {payment.amountMinor != null ? <span>{formatMoney(payment.amountMinor, payment.currency ?? 'USD')}</span> : null}
                    {payment.reviewState ? <span>Review: {payment.reviewState}</span> : null}
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>No payments yet.</div>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionEyebrow}>Audit</div>
          <div className={styles.sectionTitle}>Audit trail</div>
          <div className={styles.stack}>
            {adminSummary.auditEvents.length ? (
              adminSummary.auditEvents.map((event: any) => (
                <div key={event.id} className={styles.listCard}>
                  <div className={styles.listHead}>
                    <span className={styles.label}>{formatDateTime(event.createdAt)}</span>
                    <span className={styles.listValue}>{event.eventType ?? event.action ?? 'event'}</span>
                  </div>
                  <div className={styles.listMeta}>
                    {event.module ? <span>Module: {event.module}</span> : null}
                    {event.subjectType ? <span>Subject: {event.subjectType}</span> : null}
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>No audit events yet.</div>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionEyebrow}>Review</div>
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
