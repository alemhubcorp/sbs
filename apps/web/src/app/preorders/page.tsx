import Link from 'next/link';
import { RouteShell } from '../route-shell';
import { getCatalogPreorders, formatMoney } from '../catalog-data';
import styles from '../core-flow.module.css';

export default async function PreordersPage() {
  const { products, error } = await getCatalogPreorders();

  return (
    <RouteShell
      eyebrow="Pre-orders"
      title="Reserve incoming inventory before release with real product-linked records."
      description="Pre-orders stay tied to the live catalog, supplier ownership, release dates, and pricing so buyers can reserve future stock without falling back to mock pages."
      primary={{ label: 'Retail Listing', href: '/products/retail' }}
      secondary={{ label: 'All Products', href: '/products' }}
    >
      <div className={styles.grid}>
        {error ? <div className={styles.errorBox}>{error}</div> : null}
        {!products.length ? <div className={styles.emptyState}>No pre-orders are open right now.</div> : null}
        <div className={styles.list}>
          {products.map((product) => (
            <article className={styles.quoteCard} key={product.id}>
              <div className={styles.rfqHead}>
                <div>
                  <div className={styles.title}>{product.name}</div>
                  <div className={styles.inlineMeta}>
                    <span>Supplier: {product.sellerProfile?.displayName ?? 'Unknown supplier'}</span>
                    <span>Release: {product.preorderReleaseAt ? new Date(product.preorderReleaseAt).toLocaleDateString() : 'TBD'}</span>
                    <span>MOQ: {product.minimumOrderQuantity ?? 1}</span>
                  </div>
                </div>
                <span className={`${styles.status} ${styles.statusWarning}`}>Pre-order</span>
              </div>
              <div className={styles.inlineMeta}>
                <span>Price: {formatMoney(product.salePriceMinor ?? product.prices?.[0]?.amountMinor ?? 0, product.prices?.[0]?.currency ?? 'USD')}</span>
                <span>Deposit: {formatMoney(product.preorderDepositAmountMinor ?? 0, product.prices?.[0]?.currency ?? 'USD')}</span>
                <span>Reservations: {product.preorderReservations?.length ?? 0}</span>
              </div>
              <div className={styles.buttonRow}>
                <Link href={`/products/${product.slug}`} className={styles.button}>
                  Open Product Card
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </RouteShell>
  );
}
