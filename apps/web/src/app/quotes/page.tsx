import Link from 'next/link';
import { RouteShell } from '../route-shell';
import { QuotesBoard } from '../core-flow-client';
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

export default async function QuotesPage() {
  const { products, error } = await getPublicProducts();
  const viewer = await getMarketplaceViewer();

  return (
    <RouteShell
      eyebrow="Quotes"
      title="Supplier inbox and quote submission."
      description="Suppliers can see RFQs assigned to them and respond with a quote using the live contract API."
      primary={{ label: 'Open RFQ Board', href: '/requests' }}
      secondary={{ label: 'Open Deals', href: '/deals' }}
    >
      <div style={{ display: 'grid', gap: 16 }}>
        {error ? <div className={styles.errorBox}>{error}</div> : null}
        {viewer.role === 'guest' ? (
          <div className={styles.sectionCard}>
            <div className={styles.sectionTitle}>Sign in to work the supplier inbox.</div>
            <div className={styles.subtle}>Quote submission is available to supplier accounts after authentication.</div>
            <div className={styles.buttonRow} style={{ marginTop: 12 }}>
              <Link href="/signin?returnTo=/quotes" className={styles.button}>
                Sign In
              </Link>
              <Link href="/register/supplier" className={styles.buttonSecondary}>
                Become a Supplier
              </Link>
            </div>
          </div>
        ) : viewer.role === 'buyer' ? (
          <div className={styles.sectionCard}>
            <div className={styles.sectionTitle}>Buyer quote review lives in Deals.</div>
            <div className={styles.subtle}>Buyers accept quotes and create deals from the deal page. The RFQ inbox is shown to suppliers.</div>
            <div className={styles.buttonRow} style={{ marginTop: 12 }}>
              <Link href="/deals" className={styles.button}>
                Open Deals
              </Link>
              <Link href="/requests" className={styles.buttonSecondary}>
                Open Requests
              </Link>
            </div>
          </div>
        ) : (
          <QuotesBoard products={products} />
        )}
      </div>
    </RouteShell>
  );
}
