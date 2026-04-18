import Link from 'next/link';
import { RouteShell } from '../route-shell';
import { DealsBoard } from '../core-flow-client';
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

export default async function DealsPage() {
  const { products, error } = await getPublicProducts();
  const viewer = await getMarketplaceViewer();

  return (
    <RouteShell
      eyebrow="Deals"
      title="Quote acceptance creates deals."
      description="Accept a supplier quote to create a deal, then progress the deal through the live contract actions."
      primary={{ label: 'Open Quotes', href: '/quotes' }}
      secondary={{ label: 'Open Requests', href: '/requests' }}
    >
      <div style={{ display: 'grid', gap: 16 }}>
        {error ? <div className={styles.errorBox}>{error}</div> : null}
        {viewer.role === 'guest' ? (
          <div className={styles.sectionCard}>
            <div className={styles.sectionTitle}>Sign in to work with deals.</div>
            <div className={styles.subtle}>Deal lifecycle actions are available after authentication and role assignment.</div>
            <div className={styles.buttonRow} style={{ marginTop: 12 }}>
              <Link href="/signin?returnTo=/deals" className={styles.button}>
                Sign In
              </Link>
              <Link href="/register" className={styles.buttonSecondary}>
                Register
              </Link>
            </div>
          </div>
        ) : (
          <DealsBoard products={products} viewerRoles={viewer.roles} />
        )}
      </div>
    </RouteShell>
  );
}
