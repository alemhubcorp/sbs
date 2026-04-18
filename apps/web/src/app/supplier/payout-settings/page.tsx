import Link from 'next/link';
import { RouteShell } from '../../route-shell';
import { getMarketplaceViewer } from '../../../lib/marketplace-viewer';
import { SupplierPayoutSettingsBoard } from '../../supplier-payout-settings-client';
import styles from '../../core-flow.module.css';

export default async function SupplierPayoutSettingsPage() {
  const viewer = await getMarketplaceViewer();

  return (
    <RouteShell
      eyebrow="Supplier"
      title="Payout settings."
      description="Edit the supplier receiving details that power release instructions and invoice presentation."
      primary={{ label: 'View payouts', href: '/supplier/payouts' }}
      secondary={{ label: 'Open dashboard', href: '/dashboard' }}
    >
      {viewer.role === 'supplier' ? (
        <SupplierPayoutSettingsBoard />
      ) : (
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}>Supplier access required.</div>
          <div className={styles.subtle}>Sign in as a supplier to edit payout settings.</div>
          <div className={styles.buttonRow} style={{ marginTop: 12 }}>
            <Link href="/signin?returnTo=/supplier/payout-settings" className={styles.button}>
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
