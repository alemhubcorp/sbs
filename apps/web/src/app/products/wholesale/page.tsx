import { RouteShell } from '../../route-shell';
import { ProductCatalogClient } from '../../core-flow-client';
import { getMarketplaceViewer } from '../../../lib/marketplace-viewer';
import { getCatalogProducts } from '../../catalog-data';
import styles from '../../core-flow.module.css';

export default async function WholesaleProductsPage() {
  const [{ products, error }, viewer] = await Promise.all([getCatalogProducts({ market: 'wholesale', sort: 'newest' }), getMarketplaceViewer()]);

  return (
    <RouteShell
      eyebrow="Wholesale"
      title="Open wholesale supply, auction inventory, and RFQ-led product cards."
      description="This listing is scoped to B2B and dual-market inventory linked to real supplier profiles, quote flow, and escrow-ready deal progression."
      primary={{ label: 'Open RFQ Board', href: '/requests' }}
      secondary={{ label: 'All Products', href: '/products' }}
    >
      <div className={styles.grid}>
        {error ? <div className={styles.errorBox}>{error}</div> : null}
        <ProductCatalogClient products={products} viewerRole={viewer.role} />
      </div>
    </RouteShell>
  );
}
