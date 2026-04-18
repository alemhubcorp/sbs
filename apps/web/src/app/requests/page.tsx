import Link from 'next/link';
import { RouteShell } from '../route-shell';
import { ProductCatalogClient, RequestsBoard } from '../core-flow-client';
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

export default async function RequestsPage() {
  const { products, error } = await getPublicProducts();
  const viewer = await getMarketplaceViewer();

  return (
    <RouteShell
      eyebrow="RFQ board"
      title="Open product requests and keep the quote flow alive."
      description="This page loads saved RFQs for the current buyer session, so a request created on a product card shows up here after refresh."
      primary={{ label: 'Open Products', href: '/products' }}
      secondary={{ label: 'Open Quotes', href: '/quotes' }}
    >
      <div style={{ display: 'grid', gap: 18 }}>
        {error ? <div className={styles.errorBox}>{error}</div> : null}
        {viewer.role === 'guest' ? (
          <div className={styles.sectionCard}>
            <div className={styles.sectionTitle}>Sign in to work with RFQs.</div>
            <div className={styles.subtle}>Buyer request boards are available after authentication. Use the auth entry to continue.</div>
            <div className={styles.buttonRow} style={{ marginTop: 12 }}>
              <Link href="/signin?returnTo=/requests" className={styles.button}>
                Sign In
              </Link>
              <Link href="/register/buyer" className={styles.buttonSecondary}>
                Register
              </Link>
            </div>
          </div>
        ) : viewer.role === 'supplier' ? (
          <div className={styles.sectionCard}>
            <div className={styles.sectionTitle}>Supplier RFQ inbox lives in Quotes.</div>
            <div className={styles.subtle}>Suppliers should use the inbox to answer RFQs and send quotes. Buyer request creation is not shown here.</div>
            <div className={styles.buttonRow} style={{ marginTop: 12 }}>
              <Link href="/quotes" className={styles.button}>
                Open RFQ Inbox
              </Link>
              <Link href="/deals" className={styles.buttonSecondary}>
                Open Deals
              </Link>
            </div>
          </div>
        ) : (
          <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0d1f3c' }}>Buyer flow</div>
            <div style={{ color: '#6b7280', fontSize: '.92rem' }}>Create RFQs from product cards, then watch them persist here.</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/products" style={{ color: '#0d1f3c', fontWeight: 700 }}>
              Browse products →
            </Link>
            <Link href="/quotes" style={{ color: '#0d1f3c', fontWeight: 700 }}>
              Supplier inbox →
            </Link>
          </div>
        </div>
        <RequestsBoard products={products} />
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0d1f3c' }}>Open a live product</div>
          <ProductCatalogClient products={products} viewerRole={viewer.role} />
        </div>
          </>
        )}
      </div>
    </RouteShell>
  );
}
