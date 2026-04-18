import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RouteShell } from '../../route-shell';
import { RequestQuoteButton } from '../../core-flow-client';
import { AddToCartButton } from '../../retail-commerce-client';
import { getMarketplaceViewer } from '../../../lib/marketplace-viewer';
import styles from '../../core-flow.module.css';

const internalApiBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

type Product = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  targetMarket: string;
  status: string;
  prices?: Array<{ amountMinor: number; currency: string }>;
  category?: { name?: string | null };
  sellerProfile?: { displayName?: string | null };
};

async function getPublicProducts() {
  try {
    const response = await fetch(`${internalApiBaseUrl}/api/catalog/public/products`, { cache: 'no-store' });
    if (!response.ok) {
      return { products: [] as Product[], error: `Catalog request failed with status ${response.status}` };
    }

    return { products: (await response.json()) as Product[], error: null };
  } catch {
    return { products: [], error: 'Catalog API is unavailable.' };
  }
}

function priceLabel(product: Product) {
  const price = product.prices?.[0];
  if (!price) {
    return 'Request price';
  }

  return `${price.currency} ${(price.amountMinor / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { products, error } = await getPublicProducts();
  const viewer = await getMarketplaceViewer();
  const product = products.find((item) => item.slug === slug);

  if (error) {
    return (
      <RouteShell
        eyebrow="Product detail"
        title="Unable to load product details."
        description="The catalog service is unavailable right now. Refresh after the API recovers."
        primary={{ label: 'Back to Products', href: '/products' }}
        secondary={{ label: 'Open RFQ Board', href: '/requests' }}
      >
        <div className={styles.errorBox}>{error}</div>
      </RouteShell>
    );
  }

  if (!product) {
    notFound();
  }

  return (
    <RouteShell
      eyebrow="Product detail"
      title={product.name}
      description="Open the product card, create an RFQ, and continue into the request board."
      primary={{ label: 'Open RFQ Board', href: '/requests' }}
      secondary={{ label: 'Back to Products', href: '/products' }}
    >
      <div className={styles.grid}>
        <article className={styles.detailCard}>
          <div className={`${styles.pill} ${styles.pillTeal}`}>
            {product.targetMarket === 'b2b' ? 'B2B' : product.targetMarket === 'b2c' ? 'B2C' : 'Both'}
          </div>
          <div className={styles.sectionTitle}>{product.name}</div>
          <div className={styles.inlineMeta}>
            <div>Slug: {product.slug}</div>
            <div>Category: {product.category?.name ?? 'Uncategorized'}</div>
            <div>Seller: {product.sellerProfile?.displayName ?? 'Unknown seller'}</div>
            <div>Price: {priceLabel(product)}</div>
            <div>Status: {product.status}</div>
          </div>
          {product.description ? <div className={styles.subtle}>{product.description}</div> : null}
          {product.targetMarket !== 'b2b' ? <AddToCartButton product={product} viewerRole={viewer.role} /> : null}
          {product.targetMarket !== 'b2c' ? <RequestQuoteButton product={product} viewerRole={viewer.role} /> : null}
        </article>
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}>Next step</div>
          <div className={styles.subtle}>
            <p>After the RFQ is created, open the request board to see it saved under the current session.</p>
            <Link href="/requests">Go to Requests →</Link>
          </div>
        </div>
      </div>
    </RouteShell>
  );
}
