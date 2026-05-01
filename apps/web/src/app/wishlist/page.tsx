import { RouteShell } from '../route-shell';
import { getCatalogProducts } from '../catalog-data';
import { WishlistSummary } from '../wishlist-client';
import styles from '../core-flow.module.css';

export default async function WishlistPage() {
  const { products, error } = await getCatalogProducts({ market: 'all' });

  return (
    <RouteShell
      eyebrow="Account"
      title="Wishlist"
      description="Save products while browsing, return to them later, and move straight into cart or RFQ flows."
      primary={{ label: 'Open Products', href: '/products' }}
      secondary={{ label: 'Open Categories', href: '/categories' }}
    >
      {error ? <div className={styles.errorBox}>{error}</div> : null}
      <WishlistSummary products={products} />
    </RouteShell>
  );
}
