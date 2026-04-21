import Link from 'next/link';
import { RouteShell } from '../../../route-shell';
import { getMarketplaceViewer } from '../../../../lib/marketplace-viewer';
import { SupplierProductsClient } from '../../../supplier-products-client';
import styles from '../../../core-flow.module.css';

export default async function SupplierProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getMarketplaceViewer();
  const { id } = await params;

  return (
    <RouteShell
      eyebrow="Supplier"
      title="Product creation and catalog control."
      description="Create draft inventory, upload product images, publish marketplace-ready listings, and keep retail, wholesale, auction, preorder, and sale states aligned with the live catalog."
      primary={{ label: 'Supplier products', href: '/supplier/products' }}
      secondary={{ label: 'Public catalog', href: '/products' }}
    >
      {viewer.role === 'supplier' || viewer.role === 'admin' ? (
        <SupplierProductsClient initialProductId={id} />
      ) : (
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}>Supplier access required.</div>
          <div className={styles.subtle}>Sign in as a supplier to edit catalog products.</div>
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
