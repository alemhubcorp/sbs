import Link from 'next/link';
import { RouteShell } from '../../route-shell';
import { getMarketplaceViewer } from '../../../lib/marketplace-viewer';
import { SupplierProductsClient } from '../../supplier-products-client';
import styles from '../../core-flow.module.css';

export default async function SupplierProductsPage() {
  const viewer = await getMarketplaceViewer();

  return (
    <RouteShell
      eyebrow="Supplier"
      title="Products"
      description="Create and publish your catalog. Drafts stay private until you publish."
      primary={{ label: 'Public catalog', href: '/products' }}
      secondary={{ label: 'Dashboard', href: '/dashboard' }}
    >
      {viewer.role === 'supplier' || viewer.role === 'admin' ? (
        <SupplierProductsClient />
      ) : (
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}>Supplier access required.</div>
          <div className={styles.subtle}>Sign in as a supplier to create, edit, and publish products.</div>
          <div className={styles.buttonRow} style={{ marginTop: 12 }}>
            <Link href="/signin?returnTo=/supplier/products" className={styles.button}>
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
