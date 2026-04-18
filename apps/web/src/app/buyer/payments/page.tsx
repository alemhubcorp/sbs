import Link from 'next/link';
import { RouteShell } from '../../route-shell';
import { getMarketplaceViewer } from '../../../lib/marketplace-viewer';
import { BuyerPaymentsBoard } from '../../buyer-payments-client';
import styles from '../../core-flow.module.css';

export default async function BuyerPaymentsPage() {
  const viewer = await getMarketplaceViewer();

  return (
    <RouteShell
      eyebrow="Buyer"
      title="Payment dashboard."
      description="Track all payments tied to your orders and deals with clear statuses, dates, and direct links back to the source object."
      primary={{ label: 'Open dashboard', href: '/dashboard' }}
      secondary={{ label: 'Open orders', href: '/orders' }}
    >
      {viewer.role === 'buyer' || viewer.role === 'admin' ? (
        <BuyerPaymentsBoard />
      ) : (
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}>Buyer access required.</div>
          <div className={styles.subtle}>Sign in as a buyer to see your payment history. Admins can view the same surface from the buyer context.</div>
          <div className={styles.buttonRow} style={{ marginTop: 12 }}>
            <Link href="/signin?returnTo=/buyer/payments" className={styles.button}>
              Sign In
            </Link>
            <Link href="/register/buyer" className={styles.buttonSecondary}>
              Register
            </Link>
          </div>
        </div>
      )}
    </RouteShell>
  );
}
