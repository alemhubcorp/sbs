import { RouteShell } from '../../route-shell';
import { ProductCatalogClient } from '../../core-flow-client';
import { getMarketplaceViewer } from '../../../lib/marketplace-viewer';
import { getCatalogProducts } from '../../catalog-data';
import styles from '../../core-flow.module.css';

export default async function RetailProductsPage() {
  const [{ products, error }, viewer] = await Promise.all([getCatalogProducts({ market: 'retail', sort: 'newest' }), getMarketplaceViewer()]);

  return (
    <RouteShell
      eyebrow="Retail"
      title="Buy retail inventory with real checkout, status tracking, and sale pricing."
      description="This listing is scoped to consumer-ready SKUs backed by the live catalog database and the same order and payment records used in production."
      primary={{ label: 'Open Cart', href: '/cart' }}
      secondary={{ label: 'All Products', href: '/products' }}
    >
      <div className={styles.grid}>
        {error ? <div className={styles.errorBox}>{error}</div> : null}
        <ProductCatalogClient products={products} viewerRole={viewer.role} />
      </div>
    </RouteShell>
  );
}
