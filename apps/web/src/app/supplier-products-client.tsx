'use client';

import Link from 'next/link';
import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import styles from './core-flow.module.css';

type CategoryItem = {
  id: string;
  name: string;
  slug: string;
};

type ProductItem = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  description?: string | null;
  seoTitle?: string | null;
  metaDescription?: string | null;
  localizedContent?: Record<string, { description?: string; seoTitle?: string; metaDescription?: string }> | null;
  status: 'draft' | 'published' | 'archived';
  targetMarket: 'b2c' | 'b2b' | 'both';
  imageUrls?: string[] | null;
  availabilityStatus: 'in_stock' | 'low_stock' | 'preorder' | 'out_of_stock' | 'discontinued';
  inventoryQuantity: number;
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
  category?: { id?: string; name?: string | null } | null;
  auction?: {
    id: string;
    status: 'scheduled' | 'active' | 'closed' | 'awarded' | 'cancelled';
    startsAt: string;
    endsAt: string;
    startingBidMinor: number;
    reserveBidMinor?: number | null;
    bids?: Array<{ id: string }>;
  } | null;
  updatedAt?: string;
  createdAt?: string;
};

type ProductFormState = {
  id?: string;
  name: string;
  description: string;
  seoTitle: string;
  metaDescription: string;
  translationLanguage: string;
  localizedContent: Record<string, { description?: string; seoTitle?: string; metaDescription?: string }>;
  categoryId: string;
  targetMarket: 'b2c' | 'b2b' | 'both';
  currency: string;
  amountMinor: string;
  minimumOrderQuantity: string;
  inventoryQuantity: string;
  availabilityStatus: ProductItem['availabilityStatus'];
  leadTimeDays: string;
  imageUrls: string[];
  saleEnabled: boolean;
  compareAtAmountMinor: string;
  salePriceMinor: string;
  saleStartsAt: string;
  saleEndsAt: string;
  preorderEnabled: boolean;
  preorderReleaseAt: string;
  preorderDepositAmountMinor: string;
  auctionEnabled: boolean;
  auctionStartsAt: string;
  auctionEndsAt: string;
  auctionStartingBidMinor: string;
  auctionReserveBidMinor: string;
};

type SupplierAiConfig = {
  enabled: boolean;
  translationLanguages: string[];
};

const initialFormState: ProductFormState = {
  name: '',
  description: '',
  seoTitle: '',
  metaDescription: '',
  translationLanguage: 'ru',
  localizedContent: {},
  categoryId: '',
  targetMarket: 'both',
  currency: 'USD',
  amountMinor: '',
  minimumOrderQuantity: '1',
  inventoryQuantity: '0',
  availabilityStatus: 'in_stock',
  leadTimeDays: '',
  imageUrls: [],
  saleEnabled: false,
  compareAtAmountMinor: '',
  salePriceMinor: '',
  saleStartsAt: '',
  saleEndsAt: '',
  preorderEnabled: false,
  preorderReleaseAt: '',
  preorderDepositAmountMinor: '',
  auctionEnabled: false,
  auctionStartsAt: '',
  auctionEndsAt: '',
  auctionStartingBidMinor: '',
  auctionReserveBidMinor: ''
};

function formatMoney(amountMinor: number | string | null | undefined, currency = 'USD') {
  const amount = typeof amountMinor === 'string' ? Number(amountMinor) : amountMinor;
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return `${currency} --`;
  }

  return `${currency} ${(amount / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function statusTone(status: ProductItem['status']) {
  if (status === 'published') {
    return `${styles.status} ${styles.statusSuccess}`;
  }

  if (status === 'archived') {
    return `${styles.status} ${styles.statusError}`;
  }

  return `${styles.status} ${styles.statusWarning}`;
}

function availabilityLabel(status: ProductItem['availabilityStatus']) {
  switch (status) {
    case 'in_stock':
      return 'In stock';
    case 'low_stock':
      return 'Low stock';
    case 'preorder':
      return 'Preorder';
    case 'out_of_stock':
      return 'Out of stock';
    case 'discontinued':
      return 'Discontinued';
    default:
      return status;
  }
}

function toDateTimeLocal(value?: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (input: number) => String(input).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

async function catalogJson<T>(path: string, init?: RequestInit) {
  const hasBody = init?.body !== undefined && init?.body !== null;
  const response = await fetch(`/api/catalog/${path}`, {
    ...init,
    headers: {
      ...(hasBody ? { 'content-type': 'application/json' } : {}),
      ...(init?.headers ?? {})
    },
    cache: 'no-store'
  });

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'message' in data && typeof (data as { message?: unknown }).message === 'string'
        ? String((data as { message: string }).message)
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

async function uploadProductImage(file: File, productId?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (productId) {
    formData.append('productId', productId);
  }

  const response = await fetch('/uploads/product-images', {
    method: 'POST',
    body: formData
  });

  const payload = (await response.json()) as { success?: boolean; error?: string; publicUrl?: string };
  if (!response.ok || !payload.publicUrl) {
    throw new Error(payload.error ?? 'Image upload failed.');
  }

  return payload.publicUrl;
}

function mapProductToForm(product: ProductItem): ProductFormState {
  return {
    id: product.id,
    name: product.name,
    description: product.description ?? '',
    seoTitle: product.seoTitle ?? '',
    metaDescription: product.metaDescription ?? '',
    translationLanguage: 'ru',
    localizedContent: product.localizedContent ?? {},
    categoryId: product.category?.id ?? '',
    targetMarket: product.targetMarket,
    currency: product.prices?.[0]?.currency ?? 'USD',
    amountMinor: String(product.prices?.[0]?.amountMinor ?? ''),
    minimumOrderQuantity: String(product.minimumOrderQuantity ?? 1),
    inventoryQuantity: String(product.inventoryQuantity ?? 0),
    availabilityStatus: product.availabilityStatus,
    leadTimeDays: product.leadTimeDays === null || product.leadTimeDays === undefined ? '' : String(product.leadTimeDays),
    imageUrls: product.imageUrls?.filter(Boolean) ?? [],
    saleEnabled: Boolean(product.salePriceMinor),
    compareAtAmountMinor: product.compareAtAmountMinor === null || product.compareAtAmountMinor === undefined ? '' : String(product.compareAtAmountMinor),
    salePriceMinor: product.salePriceMinor === null || product.salePriceMinor === undefined ? '' : String(product.salePriceMinor),
    saleStartsAt: toDateTimeLocal(product.saleStartsAt),
    saleEndsAt: toDateTimeLocal(product.saleEndsAt),
    preorderEnabled: Boolean(product.isPreorderEnabled || product.availabilityStatus === 'preorder'),
    preorderReleaseAt: toDateTimeLocal(product.preorderReleaseAt),
    preorderDepositAmountMinor:
      product.preorderDepositAmountMinor === null || product.preorderDepositAmountMinor === undefined
        ? ''
        : String(product.preorderDepositAmountMinor),
    auctionEnabled: Boolean(product.auction),
    auctionStartsAt: toDateTimeLocal(product.auction?.startsAt),
    auctionEndsAt: toDateTimeLocal(product.auction?.endsAt),
    auctionStartingBidMinor:
      product.auction?.startingBidMinor === null || product.auction?.startingBidMinor === undefined
        ? ''
        : String(product.auction.startingBidMinor),
    auctionReserveBidMinor:
      product.auction?.reserveBidMinor === null || product.auction?.reserveBidMinor === undefined
        ? ''
        : String(product.auction.reserveBidMinor)
  };
}

export function SupplierProductsClient({ initialProductId }: { initialProductId?: string } = {}) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [filters, setFilters] = useState({ status: 'all', q: '' });
  const [form, setForm] = useState<ProductFormState>(initialFormState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiConfig, setAiConfig] = useState<SupplierAiConfig>({ enabled: false, translationLanguages: ['en', 'ru', 'kk', 'tr', 'zh-CN'] });
  const [aiSuggestion, setAiSuggestion] = useState<{
    field: 'description' | 'seoTitle' | 'metaDescription' | 'localizedDescription';
    value: string;
    language?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const [productsResponse, categoriesResponse] = await Promise.all([
        catalogJson<ProductItem[]>(`supplier/products?status=${encodeURIComponent(filters.status)}${filters.q ? `&q=${encodeURIComponent(filters.q)}` : ''}`),
        catalogJson<CategoryItem[]>('categories')
      ]);

      setProducts(productsResponse);
      setCategories(categoriesResponse);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to load supplier products.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadAiConfig() {
      try {
        const response = await fetch('/api/platform/public-settings', { cache: 'no-store' });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { ai?: SupplierAiConfig };
        if (!cancelled && payload.ai) {
          const languages =
            Array.isArray(payload.ai.translationLanguages) && payload.ai.translationLanguages.length
              ? payload.ai.translationLanguages
              : ['en', 'ru', 'kk', 'tr', 'zh-CN'];
          setAiConfig({
            enabled: Boolean(payload.ai.enabled),
            translationLanguages: languages
          });
          setForm((current) =>
            languages.includes(current.translationLanguage)
              ? current
              : {
                  ...current,
                  translationLanguage: languages[0] ?? 'en'
                }
          );
        }
      } catch {
        // Keep local defaults when the config endpoint is unavailable.
      }
    }

    void loadAiConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void load();
  }, [filters.status]);

  useEffect(() => {
    if (!initialProductId) {
      return;
    }

    let cancelled = false;

    async function loadProduct() {
      try {
        const product = await catalogJson<ProductItem>(`supplier/products/${initialProductId}`);
        if (!cancelled) {
          setForm(mapProductToForm(product));
        }
      } catch (failure) {
        if (!cancelled) {
          setError(failure instanceof Error ? failure.message : 'Unable to load the requested product.');
        }
      }
    }

    void loadProduct();
    return () => {
      cancelled = true;
    };
  }, [initialProductId]);

  const summary = useMemo(() => {
    return {
      total: products.length,
      published: products.filter((product) => product.status === 'published').length,
      drafts: products.filter((product) => product.status === 'draft').length,
      lowStock: products.filter((product) => ['low_stock', 'out_of_stock'].includes(product.availabilityStatus)).length
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!filters.q.trim()) {
      return products;
    }

    const search = filters.q.trim().toLowerCase();
    return products.filter((product) =>
      [product.name, product.slug, product.sku, product.description ?? '', product.category?.name ?? '']
        .join(' ')
        .toLowerCase()
        .includes(search)
    );
  }, [products, filters.q]);

  function resetForm() {
    setForm(initialFormState);
    setAiSuggestion(null);
    setSuccess(null);
    setError(null);
  }

  function editProduct(product: ProductItem) {
    setForm(mapProductToForm(product));
    setAiSuggestion(null);
    setSuccess(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateField<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function buildPayload(statusOverride?: ProductItem['status']) {
    return {
      categoryId: form.categoryId,
      name: form.name.trim(),
      description: form.description.trim(),
      ...(form.seoTitle.trim() ? { seoTitle: form.seoTitle.trim() } : {}),
      ...(form.metaDescription.trim() ? { metaDescription: form.metaDescription.trim() } : {}),
      localizedContent: Object.fromEntries(
        Object.entries(form.localizedContent)
          .map(([language, value]) => [
            language,
            {
              ...(value.description?.trim() ? { description: value.description.trim() } : {}),
              ...(value.seoTitle?.trim() ? { seoTitle: value.seoTitle.trim() } : {}),
              ...(value.metaDescription?.trim() ? { metaDescription: value.metaDescription.trim() } : {})
            }
          ])
          .filter(([, value]) => typeof value === 'object' && value !== null && Object.keys(value).length > 0)
      ),
      targetMarket: form.targetMarket,
      currency: form.currency.trim().toUpperCase(),
      amountMinor: Number(form.amountMinor),
      minimumOrderQuantity: Number(form.minimumOrderQuantity || '1'),
      inventoryQuantity: Number(form.inventoryQuantity || '0'),
      availabilityStatus: form.availabilityStatus,
      ...(form.leadTimeDays.trim() ? { leadTimeDays: Number(form.leadTimeDays) } : {}),
      imageUrls: form.imageUrls,
      status: statusOverride ?? 'draft',
      ...(form.saleEnabled
        ? {
            compareAtAmountMinor: Number(form.compareAtAmountMinor || form.amountMinor || '0'),
            salePriceMinor: Number(form.salePriceMinor),
            saleStartsAt: toIso(form.saleStartsAt),
            saleEndsAt: toIso(form.saleEndsAt)
          }
        : {}),
      isPreorderEnabled: form.preorderEnabled,
      ...(form.preorderEnabled
        ? {
            preorderReleaseAt: toIso(form.preorderReleaseAt),
            ...(form.preorderDepositAmountMinor.trim()
              ? { preorderDepositAmountMinor: Number(form.preorderDepositAmountMinor) }
              : {})
          }
        : {}),
      auctionEnabled: form.auctionEnabled,
      ...(form.auctionEnabled
        ? {
            auctionStartsAt: toIso(form.auctionStartsAt),
            auctionEndsAt: toIso(form.auctionEndsAt),
            auctionStartingBidMinor: Number(form.auctionStartingBidMinor),
            ...(form.auctionReserveBidMinor.trim() ? { auctionReserveBidMinor: Number(form.auctionReserveBidMinor) } : {})
          }
        : {})
    };
  }

  async function save(statusOverride?: ProductItem['status']) {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = buildPayload(statusOverride);
      if (!payload.name || !payload.description || !payload.categoryId || !payload.amountMinor || !payload.currency) {
        throw new Error('Name, description, category, currency, and base price are required.');
      }

      const product = form.id
        ? await catalogJson<ProductItem>(`supplier/products/${form.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          })
        : await catalogJson<ProductItem>('supplier/products', {
            method: 'POST',
            body: JSON.stringify(payload)
          });

      setSuccess(statusOverride === 'published' ? 'Product saved and ready to publish.' : 'Product saved.');
      setForm(mapProductToForm(product));
      await load();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to save product.');
    } finally {
      setSaving(false);
    }
  }

  async function publish(productId?: string) {
    const targetId = productId ?? form.id;
    if (!targetId) {
      await save('draft');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await catalogJson<ProductItem>(`supplier/products/${targetId}/publish`, { method: 'POST' });
      setSuccess('Product published.');
      await load();
      if (form.id === targetId) {
        const refreshed = await catalogJson<ProductItem>(`supplier/products/${targetId}`);
        setForm(mapProductToForm(refreshed));
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to publish product.');
    } finally {
      setSaving(false);
    }
  }

  async function unpublish(productId: string) {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await catalogJson<ProductItem>(`supplier/products/${productId}/unpublish`, { method: 'POST' });
      setSuccess('Product moved back to draft.');
      await load();
      if (form.id === productId) {
        const refreshed = await catalogJson<ProductItem>(`supplier/products/${productId}`);
        setForm(mapProductToForm(refreshed));
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to unpublish product.');
    } finally {
      setSaving(false);
    }
  }

  async function onImageSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const publicUrl = await uploadProductImage(file, form.id);
      setForm((current) => ({
        ...current,
        imageUrls: [publicUrl, ...current.imageUrls].slice(0, 8)
      }));
      setSuccess('Image uploaded and attached to the product draft.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to upload image.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function requestAiSuggestion(
    action: 'generate_description' | 'improve_description' | 'generate_seo_title' | 'generate_meta_description' | 'translate_description'
  ) {
    setAiLoading(true);
    setAiSuggestion(null);
    setError(null);
    setSuccess(null);

    try {
      const suggestion = await catalogJson<{
        field: 'description' | 'seoTitle' | 'metaDescription' | 'localizedDescription';
        value: string;
        language?: string;
      }>('supplier/products/ai-assist', {
        method: 'POST',
        body: JSON.stringify({
          action,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          seoTitle: form.seoTitle.trim() || undefined,
          metaDescription: form.metaDescription.trim() || undefined,
          categoryId: form.categoryId || undefined,
          targetMarket: form.targetMarket,
          currency: form.currency.trim().toUpperCase(),
          amountMinor: form.amountMinor.trim() ? Number(form.amountMinor) : undefined,
          language: action === 'translate_description' ? form.translationLanguage.trim() || undefined : undefined
        })
      });

      setAiSuggestion(suggestion);
      setSuccess('AI suggestion is ready. Review it and apply only if it fits the product.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to generate AI content.');
    } finally {
      setAiLoading(false);
    }
  }

  function applyAiSuggestion() {
    if (!aiSuggestion) {
      return;
    }

    if (aiSuggestion.field === 'description') {
      updateField('description', aiSuggestion.value);
    } else if (aiSuggestion.field === 'seoTitle') {
      updateField('seoTitle', aiSuggestion.value);
    } else if (aiSuggestion.field === 'metaDescription') {
      updateField('metaDescription', aiSuggestion.value);
    } else if (aiSuggestion.field === 'localizedDescription' && aiSuggestion.language) {
      const language = aiSuggestion.language;
      setForm((current) => ({
        ...current,
        localizedContent: {
          ...current.localizedContent,
          [language]: {
            ...current.localizedContent[language],
            description: aiSuggestion.value
          }
        }
      }));
    }

    setAiSuggestion(null);
    setSuccess('AI suggestion applied to the form. Save the product to persist it.');
  }

  return (
    <div className={styles.stack}>
      {/* Compact stats bar — replaces the oversized heroPanel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total products</div>
          <div className={styles.metricValue}>{summary.total}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Published</div>
          <div className={styles.metricValue}>{summary.published}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Draft / low stock</div>
          <div className={styles.metricValue}>{summary.drafts} / {summary.lowStock}</div>
        </div>
      </div>

      {error ? <div className={styles.errorBox}>{error}</div> : null}
      {success ? <div className={styles.successBox}>{success}</div> : null}

      <div className={styles.grid} style={{ gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', alignItems: 'start' }}>
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionTitle}>Your product inventory</div>
              <div className={styles.muted}>Only your own products are listed here. Published items appear in the public catalog.</div>
            </div>
            <div className={styles.buttonRow}>
              <button type="button" className={styles.buttonSecondary} onClick={() => void load()} disabled={loading}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              <button type="button" className={styles.button} onClick={resetForm}>
                New Product
              </button>
            </div>
          </div>

          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label htmlFor="supplier-product-status">Status</label>
              <select id="supplier-product-status" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className={styles.field} style={{ gridColumn: 'span 2' }}>
              <label htmlFor="supplier-product-search">Search</label>
              <input
                id="supplier-product-search"
                value={filters.q}
                onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
                placeholder="Search by name, SKU, slug, category"
              />
            </div>
          </div>

          <div className={styles.stack} style={{ marginTop: 16 }}>
            {filteredProducts.length ? (
              filteredProducts.map((product) => (
                <article key={product.id} className={styles.card}>
                  <div className={styles.sectionHeader}>
                    <div style={{ display: 'grid', gap: 6 }}>
                      <div className={styles.sectionTitle}>{product.name}</div>
                      <div className={styles.inlineMeta}>
                        <span>{product.category?.name ?? 'Uncategorized'}</span>
                        <span>{formatMoney(product.prices?.[0]?.amountMinor, product.prices?.[0]?.currency ?? 'USD')}</span>
                        <span>MOQ {product.minimumOrderQuantity ?? 1}</span>
                        <span>{product.slug}</span>
                      </div>
                    </div>
                    <div className={styles.buttonRow}>
                      <span className={statusTone(product.status)}>{product.status}</span>
                      <span className={styles.status}>{availabilityLabel(product.availabilityStatus)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '160px minmax(0, 1fr)', gap: 16 }}>
                    <div>
                      {product.imageUrls?.[0] ? (
                        <img src={product.imageUrls[0]} alt={product.name} className={styles.catalogImage} style={{ borderRadius: 16 }} />
                      ) : (
                        <div className={styles.emptyState} style={{ minHeight: 120 }}>No image</div>
                      )}
                    </div>
                    <div className={styles.stack}>
                      <div className={styles.inlineMeta}>
                        <span>{product.targetMarket === 'b2c' ? 'Retail' : product.targetMarket === 'b2b' ? 'Wholesale' : 'Retail + Wholesale'}</span>
                        <span>Inventory {product.inventoryQuantity}</span>
                        {product.auction ? <span>Auction enabled</span> : null}
                        {product.isPreorderEnabled ? <span>Preorder enabled</span> : null}
                        {product.salePriceMinor ? <span>Sale enabled</span> : null}
                      </div>
                      <div className={styles.buttonRow}>
                        <button type="button" className={styles.button} onClick={() => editProduct(product)}>
                          Edit
                        </button>
                        {product.status === 'published' ? (
                          <>
                            <Link href={`/products/${product.slug}`} className={styles.buttonSecondary}>
                              Public view
                            </Link>
                            <button type="button" className={styles.buttonSecondary} onClick={() => void unpublish(product.id)} disabled={saving}>
                              Unpublish
                            </button>
                          </>
                        ) : (
                          <button type="button" className={styles.buttonSecondary} onClick={() => void publish(product.id)} disabled={saving}>
                            Publish
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className={styles.emptyState}>No supplier products match the current filter.</div>
            )}
          </div>
        </div>

        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionTitle}>{form.id ? 'Edit product' : 'Create product'}</div>
              <div className={styles.muted}>Save drafts privately, then publish when the product is ready for buyers.</div>
            </div>
            {form.id ? (
              <span className={styles.status}>Editing {form.id.slice(0, 8)}</span>
            ) : null}
          </div>

          <div className={styles.fieldGrid}>
            <div className={styles.field} style={{ gridColumn: 'span 2' }}>
              <label htmlFor="product-name">Title</label>
              <input id="product-name" value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Industrial fasteners, premium tea set, etc." />
            </div>
            <div className={styles.field} style={{ gridColumn: 'span 2' }}>
              <label htmlFor="product-category">Category</label>
              <select id="product-category" value={form.categoryId} onChange={(event) => updateField('categoryId', event.target.value)}>
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field} style={{ gridColumn: 'span 4' }}>
              <label htmlFor="product-description">Description</label>
              <textarea id="product-description" value={form.description} onChange={(event) => updateField('description', event.target.value)} placeholder="Describe the product, materials, packaging, commercial terms, and delivery notes." />
              <div className={styles.buttonRow}>
                <button type="button" className={styles.buttonSecondary} onClick={() => void requestAiSuggestion('generate_description')} disabled={aiLoading || !aiConfig.enabled}>
                  {aiLoading ? 'Working...' : 'Generate with AI'}
                </button>
                <button type="button" className={styles.buttonSecondary} onClick={() => void requestAiSuggestion('improve_description')} disabled={aiLoading || !aiConfig.enabled || !form.description.trim()}>
                  Improve with AI
                </button>
              </div>
            </div>

            <div className={styles.field} style={{ gridColumn: 'span 2' }}>
              <label htmlFor="product-seo-title">SEO title</label>
              <input id="product-seo-title" value={form.seoTitle} onChange={(event) => updateField('seoTitle', event.target.value)} placeholder="Search-friendly title for product detail pages." />
              <button type="button" className={styles.buttonSecondary} onClick={() => void requestAiSuggestion('generate_seo_title')} disabled={aiLoading || !aiConfig.enabled}>
                Generate with AI
              </button>
            </div>

            <div className={styles.field} style={{ gridColumn: 'span 2' }}>
              <label htmlFor="product-meta-description">Meta description</label>
              <textarea
                id="product-meta-description"
                value={form.metaDescription}
                onChange={(event) => updateField('metaDescription', event.target.value)}
                placeholder="Short SEO summary shown in search snippets."
                style={{ minHeight: 110 }}
              />
              <button type="button" className={styles.buttonSecondary} onClick={() => void requestAiSuggestion('generate_meta_description')} disabled={aiLoading || !aiConfig.enabled}>
                Generate with AI
              </button>
            </div>

            <div className={styles.field} style={{ gridColumn: 'span 4' }}>
              <label>Translation</label>
              <div className={styles.buttonRow}>
                <select value={form.translationLanguage} onChange={(event) => updateField('translationLanguage', event.target.value)}>
                  {aiConfig.translationLanguages.map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
                <button type="button" className={styles.buttonSecondary} onClick={() => void requestAiSuggestion('translate_description')} disabled={aiLoading || !aiConfig.enabled || !form.description.trim()}>
                  Translate with AI
                </button>
              </div>
              {!aiConfig.enabled ? <div className={styles.helper}>AI content assistant is currently disabled by platform admin.</div> : null}
              <textarea
                value={form.localizedContent[form.translationLanguage]?.description ?? ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    localizedContent: {
                      ...current.localizedContent,
                      [current.translationLanguage]: {
                        ...current.localizedContent[current.translationLanguage],
                        description: event.target.value
                      }
                    }
                  }))
                }
                placeholder="Translated description for the selected language."
                style={{ minHeight: 120 }}
              />
            </div>

            {aiSuggestion ? (
              <div className={styles.field} style={{ gridColumn: 'span 4' }}>
                <label>AI suggestion preview</label>
                <div className={styles.emptyState}>
                  <div className={styles.inlineMeta}>
                    <span>Field: {aiSuggestion.field}</span>
                    {aiSuggestion.language ? <span>Language: {aiSuggestion.language}</span> : null}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', marginTop: 10, color: '#0f172a', lineHeight: 1.65 }}>{aiSuggestion.value}</div>
                  <div className={styles.buttonRow} style={{ marginTop: 12 }}>
                    <button type="button" className={styles.button} onClick={applyAiSuggestion}>
                      Apply suggestion
                    </button>
                    <button type="button" className={styles.buttonSecondary} onClick={() => setAiSuggestion(null)}>
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className={styles.field}>
              <label htmlFor="product-market">Sales mode</label>
              <select id="product-market" value={form.targetMarket} onChange={(event) => updateField('targetMarket', event.target.value as ProductFormState['targetMarket'])}>
                <option value="b2c">Retail</option>
                <option value="b2b">Wholesale</option>
                <option value="both">Retail + Wholesale</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="product-currency">Currency</label>
              <input id="product-currency" value={form.currency} onChange={(event) => updateField('currency', event.target.value.toUpperCase())} maxLength={3} />
            </div>
            <div className={styles.field}>
              <label htmlFor="product-price">Base price, minor units</label>
              <input id="product-price" inputMode="numeric" value={form.amountMinor} onChange={(event) => updateField('amountMinor', event.target.value)} placeholder="125000" />
            </div>
            <div className={styles.field}>
              <label htmlFor="product-moq">MOQ</label>
              <input id="product-moq" inputMode="numeric" value={form.minimumOrderQuantity} onChange={(event) => updateField('minimumOrderQuantity', event.target.value)} />
            </div>

            <div className={styles.field}>
              <label htmlFor="product-stock">Inventory</label>
              <input id="product-stock" inputMode="numeric" value={form.inventoryQuantity} onChange={(event) => updateField('inventoryQuantity', event.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor="product-availability">Availability</label>
              <select id="product-availability" value={form.availabilityStatus} onChange={(event) => updateField('availabilityStatus', event.target.value as ProductItem['availabilityStatus'])}>
                <option value="in_stock">In stock</option>
                <option value="low_stock">Low stock</option>
                <option value="preorder">Preorder</option>
                <option value="out_of_stock">Out of stock</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="product-lead-time">Lead time, days</label>
              <input id="product-lead-time" inputMode="numeric" value={form.leadTimeDays} onChange={(event) => updateField('leadTimeDays', event.target.value)} placeholder="14" />
            </div>
            <div className={styles.field}>
              <label htmlFor="product-upload">Image upload</label>
              <input id="product-upload" type="file" accept="image/*" onChange={(event) => void onImageSelected(event)} disabled={uploading} />
            </div>

            <div className={styles.field} style={{ gridColumn: 'span 4' }}>
              <label>Attached images</label>
              <div className={styles.buttonRow}>
                {form.imageUrls.length ? (
                  form.imageUrls.map((url) => (
                    <div key={url} style={{ position: 'relative' }}>
                      <img src={url} alt="Product media" style={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 12, border: '1px solid #dbe4f0' }} />
                      <button
                        type="button"
                        className={styles.buttonDanger}
                        style={{ position: 'absolute', top: 6, right: 6, padding: '4px 8px' }}
                        onClick={() => updateField('imageUrls', form.imageUrls.filter((entry) => entry !== url))}
                      >
                        X
                      </button>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyState}>No product images uploaded yet.</div>
                )}
              </div>
            </div>

            <div className={styles.field} style={{ gridColumn: 'span 4' }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={form.saleEnabled} onChange={(event) => updateField('saleEnabled', event.target.checked)} />
                Enable sale / discount pricing
              </label>
            </div>
            {form.saleEnabled ? (
              <>
                <div className={styles.field}>
                  <label htmlFor="product-compare-price">Compare-at price</label>
                  <input id="product-compare-price" inputMode="numeric" value={form.compareAtAmountMinor} onChange={(event) => updateField('compareAtAmountMinor', event.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="product-sale-price">Sale price</label>
                  <input id="product-sale-price" inputMode="numeric" value={form.salePriceMinor} onChange={(event) => updateField('salePriceMinor', event.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="product-sale-start">Sale starts</label>
                  <input id="product-sale-start" type="datetime-local" value={form.saleStartsAt} onChange={(event) => updateField('saleStartsAt', event.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="product-sale-end">Sale ends</label>
                  <input id="product-sale-end" type="datetime-local" value={form.saleEndsAt} onChange={(event) => updateField('saleEndsAt', event.target.value)} />
                </div>
              </>
            ) : null}

            <div className={styles.field} style={{ gridColumn: 'span 4' }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={form.preorderEnabled} onChange={(event) => updateField('preorderEnabled', event.target.checked)} />
                Enable preorder
              </label>
            </div>
            {form.preorderEnabled ? (
              <>
                <div className={styles.field}>
                  <label htmlFor="product-preorder-release">Release date</label>
                  <input id="product-preorder-release" type="datetime-local" value={form.preorderReleaseAt} onChange={(event) => updateField('preorderReleaseAt', event.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="product-preorder-deposit">Deposit, minor units</label>
                  <input id="product-preorder-deposit" inputMode="numeric" value={form.preorderDepositAmountMinor} onChange={(event) => updateField('preorderDepositAmountMinor', event.target.value)} />
                </div>
              </>
            ) : null}

            <div className={styles.field} style={{ gridColumn: 'span 4' }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={form.auctionEnabled} onChange={(event) => updateField('auctionEnabled', event.target.checked)} />
                Enable auction
              </label>
            </div>
            {form.auctionEnabled ? (
              <>
                <div className={styles.field}>
                  <label htmlFor="product-auction-start">Auction starts</label>
                  <input id="product-auction-start" type="datetime-local" value={form.auctionStartsAt} onChange={(event) => updateField('auctionStartsAt', event.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="product-auction-end">Auction ends</label>
                  <input id="product-auction-end" type="datetime-local" value={form.auctionEndsAt} onChange={(event) => updateField('auctionEndsAt', event.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="product-auction-starting-bid">Starting bid</label>
                  <input id="product-auction-starting-bid" inputMode="numeric" value={form.auctionStartingBidMinor} onChange={(event) => updateField('auctionStartingBidMinor', event.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="product-auction-reserve">Reserve bid</label>
                  <input id="product-auction-reserve" inputMode="numeric" value={form.auctionReserveBidMinor} onChange={(event) => updateField('auctionReserveBidMinor', event.target.value)} />
                </div>
              </>
            ) : null}
          </div>

          <div className={styles.buttonRow} style={{ marginTop: 18 }}>
            <button type="button" className={styles.buttonSecondary} onClick={() => void save('draft')} disabled={saving || uploading}>
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button type="button" className={styles.button} onClick={() => void save(form.id ? undefined : 'draft')} disabled={saving || uploading}>
              {form.id ? 'Update Product' : 'Create Product'}
            </button>
            {form.id ? (
              <>
                <button type="button" className={styles.buttonSecondary} onClick={() => void publish(form.id)} disabled={saving || uploading}>
                  Publish
                </button>
                <button type="button" className={styles.buttonSecondary} onClick={() => void unpublish(form.id!)} disabled={saving || uploading}>
                  Unpublish
                </button>
                <Link href={`/products/${products.find((entry) => entry.id === form.id)?.slug ?? ''}`} className={styles.buttonSecondary}>
                  Public page
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
