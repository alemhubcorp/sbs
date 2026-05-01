import Link from 'next/link';
import { getMarketplaceViewer } from '../../lib/marketplace-viewer';
import { PartnerOperationsBoard } from '../partner-ops-client';
import { RouteShell } from '../route-shell';
import styles from '../core-flow.module.css';

export default async function CustomsPage() {
  const viewer = await getMarketplaceViewer();
  const canOperate = viewer.role === 'customs' || viewer.role === 'admin';

  return (
    <RouteShell
      eyebrow="Customs"
      title={canOperate ? 'Assigned customs cases and clearance control.' : 'Customs operations'}
      description={
        canOperate
          ? 'Review assigned customs cases, request documents, advance clearance, and flag issues from one role-aware workspace.'
          : 'Customs brokers use this workspace after sign-in. Buyers and suppliers can follow clearance through tracking and notifications.'
      }
      primary={{ label: canOperate ? 'Refresh cases' : 'Sign In', href: canOperate ? '/customs' : '/signin?returnTo=/customs' }}
      secondary={{ label: 'Open notifications', href: '/notifications' }}
    >
      {canOperate ? (
        <PartnerOperationsBoard kind="customs" role="customs" />
      ) : (
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionTitle}>Customs workspace requires broker access.</div>
              <div className={styles.muted}>Clearance assignments and status updates are limited to customs brokers and admins.</div>
            </div>
            <div className={styles.buttonRow}>
              <Link href="/signin?returnTo=/customs" className={styles.button}>
                Sign In
              </Link>
              <Link href="/track-order" className={styles.buttonSecondary}>
                Track Orders
              </Link>
            </div>
          </div>
          <div className={styles.emptyState}>
            Public users can follow their own order status after sign-in. Customs users can request documents, mark under clearance, clear, or flag issues.
          </div>
        </div>
      )}
    </RouteShell>
  );
}
