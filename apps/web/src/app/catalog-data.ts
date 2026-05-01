const internalApiBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export type CatalogQuery = {
  q?: string;
  market?: 'retail' | 'wholesale' | 'b2c' | 'b2b' | 'all';
  category?: string;
  seller?: string;
  availability?: 'in_stock' | 'low_stock' | 'preorder' | 'out_of_stock' | 'all';
  sort?: 'newest' | 'price_asc' | 'price_desc';
};

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  status: string;
  targetMarket: string;
  description?: string | null;
  seoTitle?: string | null;
  metaDescription?: string | null;
  localizedContent?: Record<string, { description?: string; seoTitle?: string; metaDescription?: string }> | null;
  imageUrls?: string[] | null;
  availabilityStatus?: 'in_stock' | 'low_stock' | 'preorder' | 'out_of_stock' | 'discontinued' | null;
  inventoryQuantity?: number | null;
  leadTimeDays?: number | null;
  minimumOrderQuantity?: number | null;
  compareAtAmountMinor?: number | null;
  salePriceMinor?: number | null;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
  isPreorderEnabled?: boolean | null;
  preorderReleaseAt?: string | null;
  preorderDepositAmountMinor?: number | null;
  prices?: Array<{ amountMinor: number; currency: string }>;
  category?: { name?: string | null; slug?: string | null };
  sellerProfile?: { displayName?: string | null };
  auction?: {
    id: string;
    status: string;
    currency: string;
    startingBidMinor: number;
    reserveBidMinor?: number | null;
    currentBidMinor?: number | null;
    startsAt: string;
    endsAt: string;
    bids?: Array<{
      id: string;
      amountMinor: number;
      createdAt: string;
      buyerProfile?: { displayName?: string | null };
    }>;
  } | null;
  preorderReservations?: Array<{
    id: string;
    quantity: number;
    totalAmountMinor: number;
    createdAt: string;
    buyerProfile?: { displayName?: string | null };
  }>;
};

export type ProductAuction = {
  id: string;
  status: string;
  currency: string;
  startingBidMinor: number;
  reserveBidMinor?: number | null;
  currentBidMinor?: number | null;
  startsAt: string;
  endsAt: string;
  product: CatalogProduct;
  bids?: Array<{
    id: string;
    amountMinor: number;
    createdAt: string;
    buyerProfile?: { displayName?: string | null };
  }>;
};

function buildCatalogUrl(path: string, query?: CatalogQuery) {
  const url = new URL(`${internalApiBaseUrl}/api/catalog/${path}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });
  }

  return url.toString();
}

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
};

export async function getCatalogCategories() {
  try {
    // Try public endpoint first, fall back to standard endpoint
    const response = await fetch(`${internalApiBaseUrl}/api/catalog/public/categories`, { cache: 'no-store' });
    if (response.ok) {
      return { categories: (await response.json()) as CatalogCategory[], error: null };
    }
    // Fallback to non-public endpoint (may work without auth for read)
    const fallback = await fetch(`${internalApiBaseUrl}/api/catalog/categories`, { cache: 'no-store' });
    if (fallback.ok) {
      return { categories: (await fallback.json()) as CatalogCategory[], error: null };
    }
    return { categories: [] as CatalogCategory[], error: null };
  } catch {
    return { categories: [] as CatalogCategory[], error: null };
  }
}

export async function getCatalogProducts(query?: CatalogQuery) {
  try {
    const response = await fetch(buildCatalogUrl('public/products', query), { cache: 'no-store' });
    if (!response.ok) {
      return { products: [] as CatalogProduct[], error: `Catalog request failed with status ${response.status}` };
    }

    return { products: (await response.json()) as CatalogProduct[], error: null };
  } catch {
    return { products: [] as CatalogProduct[], error: 'Catalog API is unavailable.' };
  }
}

export async function getCatalogProductBySlug(slug: string) {
  try {
    const response = await fetch(buildCatalogUrl(`public/products/${slug}`), { cache: 'no-store' });
    if (response.status === 404) {
      return { product: null, error: null };
    }

    if (!response.ok) {
      return { product: null, error: `Catalog request failed with status ${response.status}` };
    }

    return { product: (await response.json()) as CatalogProduct, error: null };
  } catch {
    return { product: null as CatalogProduct | null, error: 'Catalog API is unavailable.' };
  }
}

export async function getCatalogAuctions(query?: CatalogQuery) {
  try {
    const response = await fetch(buildCatalogUrl('public/auctions', query), { cache: 'no-store' });
    if (!response.ok) {
      return { auctions: [] as ProductAuction[], error: `Auction request failed with status ${response.status}` };
    }

    return { auctions: (await response.json()) as ProductAuction[], error: null };
  } catch {
    return { auctions: [] as ProductAuction[], error: 'Auction API is unavailable.' };
  }
}

export async function getCatalogPreorders(query?: CatalogQuery) {
  try {
    const response = await fetch(buildCatalogUrl('public/preorders', query), { cache: 'no-store' });
    if (!response.ok) {
      return { products: [] as CatalogProduct[], error: `Preorder request failed with status ${response.status}` };
    }

    return { products: (await response.json()) as CatalogProduct[], error: null };
  } catch {
    return { products: [] as CatalogProduct[], error: 'Preorder API is unavailable.' };
  }
}

export function isSaleActive(product: Pick<CatalogProduct, 'salePriceMinor' | 'saleStartsAt' | 'saleEndsAt'>) {
  if (!product.salePriceMinor) {
    return false;
  }

  const now = Date.now();
  const startsAt = product.saleStartsAt ? new Date(product.saleStartsAt).getTime() : null;
  const endsAt = product.saleEndsAt ? new Date(product.saleEndsAt).getTime() : null;
  const started = startsAt === null || startsAt <= now;
  const active = endsAt === null || endsAt >= now;
  return started && active;
}

export function currentProductAmount(product: Pick<CatalogProduct, 'salePriceMinor' | 'prices' | 'saleStartsAt' | 'saleEndsAt'>) {
  const activePrice = product.prices?.[0]?.amountMinor ?? 0;
  return isSaleActive(product) && product.salePriceMinor ? Math.min(product.salePriceMinor, activePrice) : activePrice;
}

export function formatMoney(amountMinor: number | null | undefined, currency = 'USD') {
  if (amountMinor === null || amountMinor === undefined) {
    return `${currency} --`;
  }

  return `${currency} ${(amountMinor / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function availabilityLabel(status?: CatalogProduct['availabilityStatus'] | null) {
  switch (status) {
    case 'in_stock':
      return 'In stock';
    case 'low_stock':
      return 'Low stock';
    case 'preorder':
      return 'Pre-order';
    case 'out_of_stock':
      return 'Out of stock';
    case 'discontinued':
      return 'Discontinued';
    default:
      return 'Availability unknown';
  }
}
