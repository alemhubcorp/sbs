import Link from 'next/link';
import { RouteShell } from '../../route-shell';
import { getMarketplaceViewer } from '../../../lib/marketplace-viewer';
import { SupplierPayoutsBoard } from '../../supplier-payouts-client';
import styles from '../../core-flow.module.css';

export default async function SupplierPayoutsPage() {
  const viewer = await getMarketplaceViewer();

  return (
    <RouteShell
      eyebrow="Supplier"
      title="Payout dashboard."
      description="Track held escrow funds, releasable payouts, and paid-out history with direct visibility into deal-backed settlement."
      primary={{ label: 'Payout settings', href: '/supplier/payout-settings' }}
      secondary={{ label: 'Open deals', href: '/deals' }}
    >
      {viewer.role === 'supplier' || viewer.role === 'admin' ? (
        <SupplierPayoutsBoard />
      ) : (
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}>Supplier access required.</div>
          <div className={styles.subtle}>Sign in as a supplier to see payouts and escrow release states.</div>
          <div className={styles.buttonRow} style={{ marginTop: 12 }}>
            <Link href="/signin?returnTo=/supplier/payouts" className={styles.button}>
              Sign In
            </Link>
            <Link href="/register/supplier" className={styles.buttonSecondary}>
              Become a Supplier
            </Link>
          </div>
        </div>
      )}
    </RouteShell>
  );
}
