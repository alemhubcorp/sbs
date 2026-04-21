import Link from 'next/link';
import { RouteShell } from '../route-shell';
import { ProductCatalogClient } from '../core-flow-client';
import { getMarketplaceViewer } from '../../lib/marketplace-viewer';
import { getCatalogProducts, type CatalogQuery } from '../catalog-data';
import styles from '../core-flow.module.css';

function queryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildQuery(searchParams?: Record<string, string | string[] | undefined>): CatalogQuery {
  const q = queryValue(searchParams?.q);
  const category = queryValue(searchParams?.category);
  const seller = queryValue(searchParams?.seller);

  return {
    ...(q ? { q } : {}),
    market: (queryValue(searchParams?.market) as CatalogQuery['market']) ?? 'all',
    ...(category ? { category } : {}),
    ...(seller ? { seller } : {}),
    availability: (queryValue(searchParams?.availability) as CatalogQuery['availability']) ?? 'all',
    sort: (queryValue(searchParams?.sort) as CatalogQuery['sort']) ?? 'newest'
  };
}

export default async function ProductsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const query = buildQuery(resolvedSearchParams);
  const { products, error } = await getCatalogProducts(query);
  const viewer = await getMarketplaceViewer();
  const categories = Array.from(new Set(products.map((product) => product.category?.slug).filter(Boolean))) as string[];
  const sellers = Array.from(new Set(products.map((product) => product.sellerProfile?.displayName).filter(Boolean))) as string[];

  return (
    <RouteShell
      eyebrow="Catalog"
      title="Real inventory across wholesale RFQ, retail checkout, auctions, pre-orders, and sales."
      description="Browse DB-backed products, filter by market and availability, then open the exact product card for checkout, RFQ, auction bidding, or preorder reservation."
      primary={{ label: 'Retail Listing', href: '/products/retail' }}
      secondary={{ label: 'Wholesale Listing', href: '/products/wholesale' }}
    >
      <div className={styles.grid}>
        {error ? <div className={styles.errorBox}>{error}</div> : null}

        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionTitle}>Catalog filters</div>
              <div className={styles.muted}>Search products by category, supplier, availability, and market type.</div>
            </div>
            <div className={styles.buttonRow}>
              <Link href="/auctions" className={styles.buttonSecondary}>
                Auctions
              </Link>
              <Link href="/preorders" className={styles.buttonSecondary}>
                Pre-orders
              </Link>
            </div>
          </div>

          <form className={styles.fieldGrid} method="GET">
            <div className={styles.field}>
              <label htmlFor="catalog-q">Search</label>
              <input id="catalog-q" name="q" defaultValue={query.q ?? ''} placeholder="Title, supplier, SKU" />
            </div>
            <div className={styles.field}>
              <label htmlFor="catalog-market">Market</label>
              <select id="catalog-market" name="market" defaultValue={query.market ?? 'all'}>
                <option value="all">All</option>
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="catalog-availability">Availability</label>
              <select id="catalog-availability" name="availability" defaultValue={query.availability ?? 'all'}>
                <option value="all">All</option>
                <option value="in_stock">In stock</option>
                <option value="low_stock">Low stock</option>
                <option value="preorder">Pre-order</option>
                <option value="out_of_stock">Out of stock</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="catalog-sort">Sort</label>
              <select id="catalog-sort" name="sort" defaultValue={query.sort ?? 'newest'}>
                <option value="newest">Newest</option>
                <option value="price_asc">Price ↑</option>
                <option value="price_desc">Price ↓</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="catalog-category">Category</label>
              <select id="catalog-category" name="category" defaultValue={query.category ?? ''}>
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="catalog-seller">Supplier</label>
              <select id="catalog-seller" name="seller" defaultValue={query.seller ?? ''}>
                <option value="">All suppliers</option>
                {sellers.map((seller) => (
                  <option key={seller} value={seller}>
                    {seller}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.buttonRow}>
              <button type="submit" className={styles.button}>
                Apply Filters
              </button>
              <Link href="/products" className={styles.buttonSecondary}>
                Reset
              </Link>
            </div>
          </form>
        </div>

        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionTitle}>Live catalog</div>
              <div className={styles.muted}>{products.length} product(s) loaded from the marketplace database.</div>
            </div>
            <div className={styles.buttonRow}>
              <Link href="/requests" className={styles.buttonSecondary}>
                RFQ board
              </Link>
              <Link href="/cart" className={styles.buttonSecondary}>
                Cart
              </Link>
            </div>
          </div>
          <ProductCatalogClient products={products} viewerRole={viewer.role} />
        </div>
      </div>
    </RouteShell>
  );
}
