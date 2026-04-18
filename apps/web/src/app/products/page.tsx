import Link from 'next/link';
import { RouteShell } from '../route-shell';
import { ProductCatalogClient } from '../core-flow-client';
import { getMarketplaceViewer } from '../../lib/marketplace-viewer';
import styles from '../core-flow.module.css';

const internalApiBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

type Product = {
  id: string;
  slug: string;
  name: string;
  status: string;
  targetMarket: string;
  description?: string | null;
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

export default async function ProductsPage() {
  const { products, error } = await getPublicProducts();
  const viewer = await getMarketplaceViewer();

  return (
    <RouteShell
      eyebrow="Catalog"
      title="Browse products by trade corridor, price, and fulfillment path."
      description="Open the public marketplace catalog, see the live RFQ pipeline, and move into protected buying with the same Safe-Contract flow used on the homepage."
      primary={{ label: 'Open RFQ Board', href: '/requests' }}
      secondary={{ label: 'Become a Vendor', href: '/register/supplier' }}
    >
      <div style={{ display: 'grid', gap: 16 }}>
        {error ? <div className={styles.errorBox}>{error}</div> : null}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0d1f3c' }}>Real products</div>
            <div style={{ color: '#6b7280', fontSize: '.92rem' }}>Open a card to request a quote from the product detail page.</div>
          </div>
          <Link href="/requests" style={{ color: '#0d1f3c', fontWeight: 700 }}>
            View RFQ board →
          </Link>
        </div>
        <ProductCatalogClient products={products} viewerRole={viewer.role} />
      </div>
    </RouteShell>
  );
}
