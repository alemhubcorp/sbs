import { MarketplaceHome } from './marketplace-home';

const internalApiBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

type Product = {
  id: string;
  name: string;
  slug: string;
  status: string;
  targetMarket: string;
  description?: string | null;
  prices?: Array<{ amountMinor: number; currency: string }>;
  category?: { name?: string | null };
  sellerProfile?: { displayName?: string | null };
};

async function getHealth() {
  try {
    const response = await fetch(`${internalApiBaseUrl}/api/health`, { cache: 'no-store' });
    if (!response.ok) {
      return 'unreachable';
    }

    const data = (await response.json()) as { status?: string };
    return data.status ?? 'unreachable';
  } catch {
    return 'unreachable';
  }
}

async function getPublicProducts() {
  try {
    const response = await fetch(`${internalApiBaseUrl}/api/catalog/public/products`, { cache: 'no-store' });
    if (!response.ok) {
      return [];
    }

    return (await response.json()) as Product[];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [healthStatus, products] = await Promise.all([getHealth(), getPublicProducts()]);

  return <MarketplaceHome healthStatus={healthStatus} products={products} />;
}
