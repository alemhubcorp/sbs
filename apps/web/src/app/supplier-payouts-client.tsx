'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { formatDateTime, formatMoney, payoutStatusLabel } from './finance-utils';
import styles from './core-flow.module.css';

type DealItem = {
  id: string;
  dealStatus: string;
  sellerProfile?: { displayName?: string | null } | null;
  buyerProfile?: { displayName?: string | null } | null;
};

type TransactionItem = {
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
  ledgerEntries?: Array<{ id: string; entryType: string; amountMinor: number; note?: string | null; createdAt: string }>;
};

function statusTone(status: string) {
  if (['released'].includes(status)) {
    return `${styles.status} ${styles.statusSuccess}`;
  }

  if (['payout_failed', 'disputed'].includes(status)) {
    return `${styles.status} ${styles.statusError}`;
  }

  return `${styles.status} ${styles.statusWarning}`;
}

export function SupplierPayoutsBoard() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [transactionsResponse, dealsResponse] = await Promise.all([
          fetch('/api/payments/transactions', { cache: 'no-store' }),
          fetch('/api/contract/deals', { cache: 'no-store' })
        ]);

        const transactionsData = transactionsResponse.ok ? ((await transactionsResponse.json()) as TransactionItem[]) : [];
        const dealsData = dealsResponse.ok ? ((await dealsResponse.json()) as DealItem[]) : [];

        if (!cancelled) {
          setTransactions(transactionsData);
          setDeals(dealsData);
        }
      } catch (failure) {
        if (!cancelled) {
          setError(failure instanceof Error ? failure.message : 'Unable to load payouts.');
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

  const dealStatusMap = useMemo(() => new Map(deals.map((deal) => [deal.id, deal.dealStatus])), [deals]);

  const rows = useMemo(() => {
    return transactions
      .map((transaction) => {
        const dealStatus = dealStatusMap.get(transaction.dealId) ?? 'unknown';
        const payoutStatus =
          transaction.status === 'held' || transaction.status === 'partially_released'
            ? dealStatus === 'completed'
              ? 'releasable'
              : 'held'
            : transaction.status === 'released'
              ? 'released'
              : transaction.status === 'disputed'
                ? 'payout_failed'
                : transaction.status;

        return {
          ...transaction,
          payoutStatus,
          dealStatus,
          dealHref: `/deals`
        };
      })
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [transactions, dealStatusMap]);

  const summary = useMemo(() => {
    const currency = rows[0]?.currency ?? 'USD';
    const held = rows
      .filter((row) => row.payoutStatus === 'held')
      .reduce((total, row) => total + row.heldAmountMinor, 0);
    const releasable = rows
      .filter((row) => row.payoutStatus === 'releasable')
      .reduce((total, row) => total + row.heldAmountMinor, 0);
    const paid = rows
      .filter((row) => row.payoutStatus === 'released')
      .reduce((total, row) => total + row.releasedAmountMinor, 0);

    return { held, releasable, paid, currency };
  }, [rows]);

  if (loading) {
    return <div className={styles.emptyState}>Loading payout dashboard...</div>;
  }

  if (error) {
    return <div className={styles.errorBox}>{error}</div>;
  }

  return (
    <div className={styles.stack}>
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>Supplier payout summary</div>
            <div className={styles.muted}>Held funds, releasable payouts, and paid-out history.</div>
          </div>
          <div className={styles.buttonRow}>
            <Link href="/supplier/payout-settings" className={styles.buttonSecondary}>
              Payout settings
            </Link>
            <Link href="/deals" className={styles.button}>
              Open deals
            </Link>
          </div>
        </div>
        <div className={styles.inlineMeta}>
          <span>Held: {formatMoney(summary.held, summary.currency)}</span>
          <span>Releasable: {formatMoney(summary.releasable, summary.currency)}</span>
          <span>Paid: {formatMoney(summary.paid, summary.currency)}</span>
        </div>
      </div>

      {rows.length ? (
        <div className={styles.stack}>
          {rows.map((row) => (
            <div key={row.id} className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <div className={styles.sectionTitle}>{row.deal?.title ?? `Deal ${row.dealId.slice(0, 8)}`}</div>
                  <div className={styles.muted}>
                    Deal status: {row.dealStatus} · Ledger: {row.ledgerEntries?.length ?? 0} events
                  </div>
                </div>
                <span className={statusTone(row.payoutStatus)}>{payoutStatusLabel(row.payoutStatus)}</span>
              </div>
              <div className={styles.inlineMeta} style={{ marginTop: 12 }}>
                <span>Amount: {formatMoney(row.totalAmountMinor, row.currency)}</span>
                <span>Held: {formatMoney(row.heldAmountMinor, row.currency)}</span>
                <span>Released: {formatMoney(row.releasedAmountMinor, row.currency)}</span>
                <span>Refunded: {formatMoney(row.refundedAmountMinor, row.currency)}</span>
                <span>Created: {formatDateTime(row.createdAt)}</span>
              </div>
              <div className={styles.buttonRow} style={{ marginTop: 12 }}>
                <Link href="/deals" className={styles.buttonSecondary}>
                  Open deal
                </Link>
                {row.payoutStatus === 'releasable' ? <span className={styles.status}>Ready for release</span> : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div>No payouts yet.</div>
          <div style={{ marginTop: 8 }}>Funds will appear here after an order or deal is funded and released.</div>
        </div>
      )}
    </div>
  );
}
