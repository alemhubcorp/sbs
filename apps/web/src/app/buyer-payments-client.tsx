'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { formatDateTime, formatMoney, normalizeFlowLabel, paymentMethodLabel, paymentStatusLabel } from './finance-utils';
import styles from './core-flow.module.css';

type PaymentRecordEntry = {
  id: string;
  scope: 'order' | 'deal';
  orderId?: string | null;
  dealId?: string | null;
  amountMinor: number;
  currency: string;
  method: string;
  provider: string;
  status: string;
  paymentReference?: string | null;
  transactionId?: string | null;
  bankReference?: string | null;
  createdAt: string;
  updatedAt: string;
};

type RetailOrder = {
  id: string;
  status: string;
  paymentStatus: string;
  totalAmountMinor: number;
  currency: string;
  createdAt: string;
  paymentRecords?: Array<{
    id: string;
    scope: 'order';
    orderId?: string | null;
    amountMinor: number;
    currency: string;
    method: string;
    provider: string;
    status: string;
    paymentReference?: string | null;
    transactionId?: string | null;
    bankReference?: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

type WholesaleDeal = {
  id: string;
  dealStatus: string;
  createdAt: string;
  quote?: { totalPrice: number; currency: string } | null;
  paymentRecords?: Array<{
    id: string;
    scope: 'deal';
    dealId?: string | null;
    amountMinor: number;
    currency: string;
    method: string;
    provider: string;
    status: string;
    paymentReference?: string | null;
    transactionId?: string | null;
    bankReference?: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

function statusTone(status: string) {
  if (['paid', 'authorized', 'released'].includes(status)) {
    return `${styles.status} ${styles.statusSuccess}`;
  }

  if (['failed', 'cancelled', 'refunded'].includes(status)) {
    return `${styles.status} ${styles.statusError}`;
  }

  return `${styles.status} ${styles.statusWarning}`;
}

export function BuyerPaymentsBoard() {
  const [orders, setOrders] = useState<RetailOrder[]>([]);
  const [deals, setDeals] = useState<WholesaleDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [ordersResponse, dealsResponse] = await Promise.all([
          fetch('/api/retail/orders', { cache: 'no-store' }),
          fetch('/api/contract/deals', { cache: 'no-store' })
        ]);

        const ordersData = ordersResponse.ok ? ((await ordersResponse.json()) as RetailOrder[]) : [];
        const dealsData = dealsResponse.ok ? ((await dealsResponse.json()) as WholesaleDeal[]) : [];

        if (!cancelled) {
          setOrders(ordersData);
          setDeals(dealsData);
        }
      } catch (failure) {
        if (!cancelled) {
          setError(failure instanceof Error ? failure.message : 'Unable to load payments.');
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
  }, []);

  const payments = useMemo(() => {
    const list: Array<
      PaymentRecordEntry & {
        href: string;
        title: string;
        subtitle: string;
        flowLabel: string;
      }
    > = [];

    for (const order of orders) {
      for (const payment of order.paymentRecords ?? []) {
        list.push({
          ...payment,
          href: `/orders/${order.id}`,
          title: `Order ${order.id.slice(0, 8)}`,
          subtitle: `Order status: ${order.status} · Payment: ${order.paymentStatus}`,
          flowLabel: normalizeFlowLabel(payment.scope)
        });
      }
    }

    for (const deal of deals) {
      for (const payment of deal.paymentRecords ?? []) {
        list.push({
          ...payment,
          href: '/deals',
          title: `Deal ${deal.id.slice(0, 8)}`,
          subtitle: `Deal status: ${deal.dealStatus}`,
          flowLabel: normalizeFlowLabel(payment.scope)
        });
      }
    }

    const filtered = list.filter((payment) => {
      if (statusFilter && payment.status !== statusFilter) {
        return false;
      }

      if (methodFilter && payment.method !== methodFilter) {
        return false;
      }

      if (dateFilter) {
        const day = new Date(payment.createdAt).toISOString().slice(0, 10);
        if (day !== dateFilter) {
          return false;
        }
      }

      return true;
    });

    return filtered.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [orders, deals, statusFilter, methodFilter, dateFilter]);

  const summary = useMemo(() => {
    const pending = payments.filter((payment) => ['pending', 'processing', 'awaiting_confirmation', 'awaiting_transfer', 'requires_review'].includes(payment.status));
    const last = payments[0];
    return {
      pendingCount: pending.length,
      lastStatus: last ? paymentStatusLabel(last.status) : 'n/a'
    };
  }, [payments]);

  if (loading) {
    return <div className={styles.emptyState}>Loading your payment dashboard...</div>;
  }

  if (error) {
    return <div className={styles.errorBox}>{error}</div>;
  }

  return (
    <div className={styles.stack}>
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>Payment summary</div>
            <div className={styles.muted}>One view for buyer orders and deal payments.</div>
          </div>
          <div className={styles.buttonRow}>
            <Link href="/checkout" className={styles.buttonSecondary}>
              Checkout
            </Link>
            <Link href="/deals" className={styles.button}>
              Open deals
            </Link>
          </div>
        </div>
        <div className={styles.metaRow}>
          <span>Pending payments: {summary.pendingCount}</span>
          <span>Last status: {summary.lastStatus}</span>
          <span>Total records: {payments.length}</span>
        </div>
      </div>

      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          <span style={{ fontWeight: 700 }}>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            {Array.from(new Set(payments.map((payment) => payment.status))).map((status) => (
              <option key={status} value={status}>
                {paymentStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span style={{ fontWeight: 700 }}>Method</span>
          <select value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)}>
            <option value="">All methods</option>
            {Array.from(new Set(payments.map((payment) => payment.method))).map((method) => (
              <option key={method} value={method}>
                {paymentMethodLabel(method)}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span style={{ fontWeight: 700 }}>Date</span>
          <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
        </label>
      </div>

      {payments.length ? (
        <div className={styles.stack}>
          {payments.map((payment) => (
            <div key={payment.id} className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <div className={styles.sectionTitle}>{payment.title}</div>
                  <div className={styles.muted}>
                    {payment.subtitle} · {paymentMethodLabel(payment.method)} · {payment.provider}
                  </div>
                </div>
                <span className={statusTone(payment.status)}>{paymentStatusLabel(payment.status)}</span>
              </div>
              <div className={styles.metaRow} style={{ marginTop: 12 }}>
                <span>Flow: {payment.flowLabel}</span>
                <span>Amount: {formatMoney(payment.amountMinor, payment.currency)}</span>
                <span>Created: {formatDateTime(payment.createdAt)}</span>
                <span>Reference: {payment.paymentReference ?? 'n/a'}</span>
              </div>
              <div className={styles.buttonRow} style={{ marginTop: 12 }}>
                <Link href={payment.href} className={styles.buttonSecondary}>
                  Open source
                </Link>
                {payment.transactionId ? <span className={styles.status}>Txn {payment.transactionId.slice(0, 8)}</span> : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div>No payments yet.</div>
          <div style={{ marginTop: 8 }}>Start with <Link href="/products">browse products</Link> or create a request quote.</div>
        </div>
      )}
    </div>
  );
}
