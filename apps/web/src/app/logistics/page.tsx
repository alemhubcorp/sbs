import Link from 'next/link';
import { getMarketplaceViewer } from '../../lib/marketplace-viewer';
import { PartnerOperationsBoard } from '../partner-ops-client';
import { RouteShell } from '../route-shell';
import styles from '../core-flow.module.css';

export default async function LogisticsPage() {
  const viewer = await getMarketplaceViewer();
  const canOperate = viewer.role === 'logistics' || viewer.role === 'admin';

  return (
    <RouteShell
      eyebrow="Logistics"
      title={canOperate ? 'Assigned shipments and freight control.' : 'Logistics operations'}
      description={
        canOperate
          ? 'Review assigned shipment work, update delivery status, and keep logistics milestones connected to marketplace orders and deals.'
          : 'Logistics partners use this workspace after sign-in. Buyers and suppliers can track delivery through orders and tracking.'
      }
      primary={{ label: canOperate ? 'Refresh assignments' : 'Sign In', href: canOperate ? '/logistics' : '/signin?returnTo=/logistics' }}
      secondary={{ label: 'Track orders', href: '/track-order' }}
    >
      {canOperate ? (
        <PartnerOperationsBoard kind="shipment" role="logistics" />
      ) : (
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionTitle}>Logistics workspace requires operator access.</div>
              <div className={styles.muted}>Shipment assignments and status updates are limited to logistics operators and admins.</div>
            </div>
            <div className={styles.buttonRow}>
              <Link href="/signin?returnTo=/logistics" className={styles.button}>
                Sign In
              </Link>
              <Link href="/track-order" className={styles.buttonSecondary}>
                Track Orders
              </Link>
            </div>
          </div>
          <div className={styles.emptyState}>
            Public users can track their own orders after sign-in. Logistics users can accept, move in transit, deliver, and complete assigned shipments.
          </div>
        </div>
      )}
    </RouteShell>
  );
}
