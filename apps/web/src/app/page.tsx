import { getOptionalAccessToken, getOptionalSession } from '../lib/auth';

const apiBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

async function getHealth() {
  try {
    const response = await fetch(`${apiBaseUrl}/api/health`);
    if (!response.ok) {
      return { status: 'unreachable' };
    }
    return (await response.json()) as { status: string };
  } catch {
    return { status: 'unreachable' };
  }
}

async function getPublicProducts() {
  try {
    const response = await fetch(`${apiBaseUrl}/api/catalog/public/products`);
    if (!response.ok) {
      return [];
    }

    return (await response.json()) as Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
      targetMarket: string;
      prices?: Array<{ amountMinor: number; currency: string }>;
      category?: { name?: string };
      sellerProfile?: { displayName?: string };
    }>;
  } catch {
    return [];
  }
}

async function getAuthContext() {
  const accessToken = await getOptionalAccessToken();

  if (!accessToken) {
    return null;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/identity/context`, {
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as {
      email?: string | null;
      username?: string | null;
      roles?: string[];
      tenantId?: string | null;
    };
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const health = await getHealth();
  const products = await getPublicProducts();
  const session = await getOptionalSession();
  const authContext = await getAuthContext();

  return (
    <main style={{ fontFamily: 'sans-serif', padding: 24, display: 'grid', gap: 24 }}>
      <h1>RuFlo Marketplace Platform</h1>
      <p>Client-facing MVP shell.</p>
      <p>Backend health: <strong>{health.status}</strong></p>
      <p>
        {session ? (
          <>
            Signed in as <strong>{authContext?.email ?? authContext?.username ?? session.profile.email ?? 'user'}</strong>{' '}
            | <a href="/auth/logout">Logout</a>
          </>
        ) : (
          <a href="/auth/login?returnTo=/">Login with Keycloak</a>
        )}
      </p>
      <section>
        <h2>Public Product Listing</h2>
        <ul>
          {products.map((product) => (
            <li key={product.id}>
              {product.name} ({product.slug}) [{product.targetMarket}] - {product.category?.name ?? 'Uncategorized'} -{' '}
              {product.sellerProfile?.displayName ?? 'Unknown seller'} -{' '}
              {product.prices?.[0] ? `${product.prices[0].currency} ${(product.prices[0].amountMinor / 100).toFixed(2)}` : 'No price'}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
