'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AddToCartButton } from './retail-commerce-client';
import type { CatalogProduct } from './catalog-data';
import { availabilityLabel, currentProductAmount, formatMoney, isSaleActive } from './catalog-data';
import styles from './core-flow.module.css';

type Product = CatalogProduct;

type ContractRfq = {
  id: string;
  productId: string | null;
  qty: number;
  createdAt: string;
  status: 'new' | 'quoted' | 'accepted' | 'rejected';
  quotes?: ContractQuote[];
  deal?: ContractDeal | null;
};

type ContractQuote = {
  id: string;
  rfqId: string;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  note?: string | null;
  status: 'submitted' | 'accepted' | 'rejected';
  rfq?: ContractRfq;
  deal?: ContractDeal | null;
};

type ContractDeal = {
  id: string;
  rfqId: string;
  quoteId: string | null;
  dealStatus: string;
  buyerStatus: string;
  supplierStatus: string;
  rfq?: ContractRfq;
  quote?: ContractQuote | null;
  paymentRecords?: ContractDealPaymentRecord[];
};

type ContractDealPaymentAttempt = {
  id: string;
  attemptType: 'initiate' | 'confirm' | 'reconcile' | 'webhook' | 'manual';
  method: 'card' | 'qr' | 'bank_transfer' | 'swift' | 'iban_invoice' | 'manual';
  provider: 'internal_manual' | 'airwallex' | 'none';
  status:
    | 'invoice_issued'
    | 'pending'
    | 'processing'
    | 'authorized'
    | 'awaiting_transfer'
    | 'awaiting_confirmation'
    | 'paid'
    | 'failed'
    | 'cancelled'
    | 'refunded'
    | 'requires_review'
    | 'mismatch_detected';
  amountMinor: number;
  currency: string;
  externalId?: string | null;
  transactionId?: string | null;
  bankReference?: string | null;
  paymentReference?: string | null;
  note?: string | null;
  payload?: Record<string, unknown> | string | number | boolean | null;
  createdAt?: string;
};

type ContractDealPaymentRecord = {
  id: string;
  scope: 'order' | 'deal';
  amountMinor: number;
  currency: string;
  method: 'card' | 'qr' | 'bank_transfer' | 'swift' | 'iban_invoice' | 'manual';
  provider: 'internal_manual' | 'airwallex' | 'none';
  status:
    | 'invoice_issued'
    | 'pending'
    | 'processing'
    | 'authorized'
    | 'awaiting_transfer'
    | 'awaiting_confirmation'
    | 'paid'
    | 'failed'
    | 'cancelled'
    | 'refunded'
    | 'requires_review'
    | 'mismatch_detected';
  externalId?: string | null;
  transactionId?: string | null;
  bankReference?: string | null;
  paymentReference?: string | null;
  instructions?: Record<string, unknown> | string | number | boolean | null;
  metadata?: Record<string, unknown> | string | number | boolean | null;
  createdAt: string;
  updatedAt?: string;
  attempts?: ContractDealPaymentAttempt[];
};

type LoadState<T> = {
  loading: boolean;
  data: T;
  error: string | null;
};

export type MarketplaceRole = 'guest' | 'buyer' | 'supplier' | 'logistics' | 'customs' | 'admin';

type AuthRedirectError = Error & {
  name: 'AuthRedirectError';
};

type RequestQuoteButtonProps = {
  product: Product;
  viewerRole: MarketplaceRole;
};

function priceLabel(product: Product) {
  const price = product.prices?.[0];
  if (!price) {
    return 'Request price';
  }

  return formatMoney(currentProductAmount(product), price.currency);
}

function productLabel(product?: Product | null) {
  if (!product) {
    return 'Unknown product';
  }

  return `${product.name} (${product.slug})`;
}

function productImage(product: Product) {
  return product.imageUrls?.[0] ?? null;
}

function productMarketLabel(targetMarket: Product['targetMarket']) {
  return targetMarket === 'b2b' ? 'B2B' : targetMarket === 'b2c' ? 'B2C' : 'B2B / B2C';
}

function isBuyerFacingRole(viewerRole: MarketplaceRole) {
  return viewerRole === 'buyer' || viewerRole === 'admin';
}

function dealPaymentMethodLabel(method?: ContractDealPaymentRecord['method'] | null) {
  switch (method) {
    case 'card':
      return 'Card';
    case 'qr':
      return 'QR';
    case 'bank_transfer':
      return 'Bank transfer';
    case 'swift':
      return 'SWIFT';
    case 'iban_invoice':
      return 'IBAN invoice';
    case 'manual':
      return 'Manual';
    default:
      return 'Not selected';
  }
}

function dealPaymentProviderLabel(provider?: ContractDealPaymentRecord['provider'] | null) {
  switch (provider) {
    case 'airwallex':
      return 'Airwallex';
    case 'internal_manual':
      return 'Internal manual';
    case 'none':
      return 'None';
    default:
      return 'Not selected';
  }
}

function dealPaymentStatusClass(status?: ContractDealPaymentRecord['status'] | null) {
  if (!status) {
    return styles.status;
  }

  if (status === 'paid') {
    return `${styles.status} ${styles.statusSuccess}`;
  }

  if (status === 'failed' || status === 'cancelled' || status === 'mismatch_detected') {
    return `${styles.status} ${styles.statusError}`;
  }

  return `${styles.status} ${styles.statusWarning}`;
}

function dealPaymentInstructionEntries(record?: ContractDealPaymentRecord | null) {
  if (!record || !record.instructions || typeof record.instructions !== 'object' || Array.isArray(record.instructions)) {
    return [];
  }

  return Object.entries(record.instructions as Record<string, unknown>).filter(([, value]) => value !== undefined && value !== null && value !== '');
}

function redirectToSignIn() {
  if (typeof window === 'undefined') {
    return;
  }

  const returnTo = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/signin?returnTo=${encodeURIComponent(returnTo)}`);
}

function authRedirectError(): AuthRedirectError {
  const error = new Error('Your session is no longer valid. Please sign in again.') as AuthRedirectError;
  error.name = 'AuthRedirectError';
  return error;
}

function isAuthRedirectError(error: unknown): error is AuthRedirectError {
  return error instanceof Error && error.name === 'AuthRedirectError';
}

async function contractJson<T>(path: string, init?: RequestInit) {
  const hasBody = init?.body !== undefined && init?.body !== null;
  const response = await fetch(`/api/contract/${path}`, {
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
    if (response.status === 401) {
      redirectToSignIn();
      throw authRedirectError();
    }

    const message =
      typeof data === 'object' && data !== null && 'message' in data && typeof (data as { message?: unknown }).message === 'string'
        ? String((data as { message: string }).message)
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data as T;
}

async function contractList<T>(path: string) {
  return contractJson<T>(path, { method: 'GET', headers: { 'content-type': 'application/json' } });
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
    if (response.status === 401) {
      redirectToSignIn();
      throw authRedirectError();
    }

    const message =
      typeof data === 'object' && data !== null && 'message' in data && typeof (data as { message?: unknown }).message === 'string'
        ? String((data as { message: string }).message)
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data as T;
}

export function RequestQuoteButton({ product, viewerRole }: RequestQuoteButtonProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (viewerRole === 'guest') {
    return (
      <div className={styles.stack}>
        <div className={styles.subtle}>Sign in to request a quote from this product.</div>
        <div className={styles.buttonRow}>
          <Link href={`/signin?returnTo=/products/${product.slug}`} className={styles.button}>
            Sign In
          </Link>
          <Link href="/requests" className={styles.buttonSecondary}>
            Open RFQ Board
          </Link>
        </div>
      </div>
    );
  }

  if (viewerRole === 'supplier') {
    return (
      <div className={styles.stack}>
        <div className={styles.subtle}>Supplier accounts quote RFQs from the inbox, not from product pages.</div>
        <div className={styles.buttonRow}>
          <Link href="/quotes" className={styles.button}>
            Open RFQ Inbox
          </Link>
          <Link href="/deals" className={styles.buttonSecondary}>
            Open Deals
          </Link>
        </div>
      </div>
    );
  }

  async function requestQuote() {
    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const response = await contractJson<{ status?: string; message?: string; data?: { id?: string } }>('rfq', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          qty: 1
        })
      });

      setSuccess(response.message ?? 'RFQ created.');
    } catch (requestError) {
      if (isAuthRedirectError(requestError)) {
        return;
      }

      setError(requestError instanceof Error ? requestError.message : 'Unable to create RFQ.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.stack}>
      <div className={styles.buttonRow}>
        <button type="button" className={styles.button} onClick={() => void requestQuote()} disabled={loading}>
          {loading ? 'Requesting...' : 'Request Quote'}
        </button>
        <Link href="/requests" className={styles.buttonSecondary}>
          Open RFQ Board
        </Link>
      </div>
      {success ? <div className={styles.successBox}>{success}</div> : null}
      {error ? <div className={styles.errorBox}>{error}</div> : null}
    </div>
  );
}

export function AuctionBidPanel({ product, viewerRole }: { product: Product; viewerRole: MarketplaceRole }) {
  const auction = product.auction;
  const [amountMinor, setAmountMinor] = useState(String((auction?.currentBidMinor ?? auction?.startingBidMinor ?? 0) + 1000));
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!auction) {
    return null;
  }

  const activeAuction = auction;

  if (viewerRole === 'guest') {
    return (
      <div className={styles.stack}>
        <div className={styles.subtle}>Sign in to place bids on wholesale auction inventory.</div>
        <Link href={`/signin?returnTo=/products/${product.slug}`} className={styles.button}>
          Sign In
        </Link>
      </div>
    );
  }

  if (!isBuyerFacingRole(viewerRole)) {
    return <div className={styles.subtle}>Auction bidding is reserved for buyer accounts and platform admins.</div>;
  }

  async function submitBid() {
    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const bid = await catalogJson<{ amountMinor: number }>(`auctions/${activeAuction.id}/bids`, {
        method: 'POST',
        body: JSON.stringify({
          amountMinor: Number(amountMinor)
        })
      });

      setSuccess(`Bid submitted at ${formatMoney(bid.amountMinor, activeAuction.currency)}.`);
    } catch (requestError) {
      if (isAuthRedirectError(requestError)) {
        return;
      }

      setError(requestError instanceof Error ? requestError.message : 'Unable to place bid.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.stack}>
      <div className={styles.inlineMeta}>
        <span className={`${styles.status} ${styles.statusWarning}`}>Auction</span>
        <span>Current: {formatMoney(activeAuction.currentBidMinor ?? activeAuction.startingBidMinor, activeAuction.currency)}</span>
        <span>Ends: {new Date(activeAuction.endsAt).toLocaleString()}</span>
      </div>
      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <label htmlFor={`auction-bid-${activeAuction.id}`}>Bid amount</label>
          <input
            id={`auction-bid-${activeAuction.id}`}
            type="number"
            min={activeAuction.currentBidMinor ?? activeAuction.startingBidMinor}
            step="100"
            value={amountMinor}
            onChange={(event) => setAmountMinor(event.target.value)}
          />
        </div>
      </div>
      <div className={styles.buttonRow}>
        <button type="button" className={styles.button} onClick={() => void submitBid()} disabled={loading}>
          {loading ? 'Submitting...' : 'Place Bid'}
        </button>
        <Link href="/auctions" className={styles.buttonSecondary}>
          Open Auctions
        </Link>
      </div>
      {success ? <div className={styles.successBox}>{success}</div> : null}
      {error ? <div className={styles.errorBox}>{error}</div> : null}
    </div>
  );
}

export function PreorderReservationPanel({ product, viewerRole }: { product: Product; viewerRole: MarketplaceRole }) {
  const [quantity, setQuantity] = useState(String(Math.max(1, product.minimumOrderQuantity ?? 1)));
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!product.isPreorderEnabled && product.availabilityStatus !== 'preorder') {
    return null;
  }

  if (viewerRole === 'guest') {
    return (
      <div className={styles.stack}>
        <div className={styles.subtle}>Sign in to reserve preorder supply before release.</div>
        <Link href={`/signin?returnTo=/products/${product.slug}`} className={styles.button}>
          Sign In
        </Link>
      </div>
    );
  }

  if (!isBuyerFacingRole(viewerRole)) {
    return <div className={styles.subtle}>Preorder reservations are reserved for buyer accounts and platform admins.</div>;
  }

  async function submitReservation() {
    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const reservation = await catalogJson<{ quantity: number; totalAmountMinor: number }>(`products/${product.id}/preorders`, {
        method: 'POST',
        body: JSON.stringify({
          quantity: Number(quantity),
          note
        })
      });

      setSuccess(`Preorder reserved for ${reservation.quantity} units.`);
    } catch (requestError) {
      if (isAuthRedirectError(requestError)) {
        return;
      }

      setError(requestError instanceof Error ? requestError.message : 'Unable to reserve preorder.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.stack}>
      <div className={styles.inlineMeta}>
        <span className={`${styles.status} ${styles.statusWarning}`}>Pre-order</span>
        <span>Release: {product.preorderReleaseAt ? new Date(product.preorderReleaseAt).toLocaleDateString() : 'TBD'}</span>
        <span>Deposit: {formatMoney(product.preorderDepositAmountMinor ?? 0, product.prices?.[0]?.currency ?? 'USD')}</span>
      </div>
      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <label htmlFor={`preorder-qty-${product.id}`}>Quantity</label>
          <input
            id={`preorder-qty-${product.id}`}
            type="number"
            min={product.minimumOrderQuantity ?? 1}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`preorder-note-${product.id}`}>Note</label>
          <input id={`preorder-note-${product.id}`} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
      </div>
      <div className={styles.buttonRow}>
        <button type="button" className={styles.button} onClick={() => void submitReservation()} disabled={loading}>
          {loading ? 'Reserving...' : 'Reserve Preorder'}
        </button>
        <Link href="/preorders" className={styles.buttonSecondary}>
          Open Preorders
        </Link>
      </div>
      {success ? <div className={styles.successBox}>{success}</div> : null}
      {error ? <div className={styles.errorBox}>{error}</div> : null}
    </div>
  );
}

export function ProductCatalogClient({ products, viewerRole }: { products: Product[]; viewerRole: MarketplaceRole }) {
  return (
    <div className={styles.catalogGrid}>
      {products.map((product) => (
        <article className={styles.catalogCard} key={product.id}>
          {productImage(product) ? <img src={productImage(product)!} alt={product.name} className={styles.catalogImage} /> : null}
          <div className={styles.catalogCardInner}>
            <div className={styles.catalogTop}>
              <span
                className={`${styles.pill} ${
                  product.targetMarket === 'b2b' ? styles.pillBlue : product.targetMarket === 'b2c' ? styles.pillAmber : styles.pillTeal
                }`}
              >
                {productMarketLabel(product.targetMarket)}
              </span>
              <span className={`${styles.status} ${product.availabilityStatus === 'in_stock' ? styles.statusSuccess : styles.statusWarning}`}>
                {availabilityLabel(product.availabilityStatus)}
              </span>
            </div>
            <Link href={`/products/${product.slug}`} className={styles.catalogName} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>{product.name}</Link>
            <div className={styles.catalogMeta}>
              <div>{product.category?.name ?? 'Uncategorized'}</div>
              <div>{product.sellerProfile?.displayName ?? 'Unknown seller'}</div>
              <div>{priceLabel(product)}</div>
              <div>
                MOQ {product.minimumOrderQuantity ?? 1}
                {product.inventoryQuantity !== null && product.inventoryQuantity !== undefined ? ` · ${product.inventoryQuantity} units` : ''}
              </div>
              {product.leadTimeDays ? <div>Lead time {product.leadTimeDays} days</div> : null}
              {isSaleActive(product) && product.compareAtAmountMinor ? (
                <div>
                  Sale from {formatMoney(product.compareAtAmountMinor, product.prices?.[0]?.currency ?? 'USD')} to{' '}
                  {formatMoney(currentProductAmount(product), product.prices?.[0]?.currency ?? 'USD')}
                </div>
              ) : null}
              {product.auction ? <div>Auction live · ends {new Date(product.auction.endsAt).toLocaleDateString()}</div> : null}
              {product.isPreorderEnabled || product.availabilityStatus === 'preorder' ? (
                <div>Pre-order release {product.preorderReleaseAt ? new Date(product.preorderReleaseAt).toLocaleDateString() : 'TBD'}</div>
              ) : null}
            </div>
            <div className={styles.catalogFoot}>
              <Link href={`/products/${product.slug}`} className={styles.catalogAction}>
                Open card →
              </Link>
              {product.targetMarket !== 'b2c' ? (
                viewerRole === 'guest' ? (
                  <Link href={`/signin?returnTo=/products/${product.slug}`} className={styles.buttonSecondary}>
                    Sign In to Request
                  </Link>
                ) : viewerRole === 'supplier' ? (
                  <Link href="/quotes" className={styles.buttonSecondary}>
                    RFQ Inbox
                  </Link>
                ) : (
                  <Link href={`/products/${product.slug}`} className={styles.buttonSecondary}>
                    Request Quote
                  </Link>
                )
              ) : null}
            </div>
            {product.targetMarket !== 'b2b' && !product.isPreorderEnabled && product.availabilityStatus !== 'preorder' ? (
              <AddToCartButton product={product} viewerRole={viewerRole} />
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function loadingState<T>(data: T): LoadState<T> {
  return {
    loading: true,
    data,
    error: null
  };
}

export function RequestsBoard({
  products,
  initialRfqs = []
}: {
  products: Product[];
  initialRfqs?: ContractRfq[];
}) {
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product] as const)),
    [products]
  );
  const [state, setState] = useState<LoadState<ContractRfq[]>>(loadingState(initialRfqs));

  async function loadRfqs() {
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const data = await contractList<ContractRfq[]>('rfq');
      setState({ loading: false, data, error: null });
    } catch (requestError) {
      if (isAuthRedirectError(requestError)) {
        return;
      }

      setState({
        loading: false,
        data: [],
        error: requestError instanceof Error ? requestError.message : 'Unable to load RFQs.'
      });
    }
  }

  useEffect(() => {
    void loadRfqs();
  }, []);

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div>
          <div className={styles.sectionTitle}>My Requests</div>
          <div className={styles.muted}>Saved RFQs from the current buyer session.</div>
        </div>
        <div className={styles.buttonRow}>
          <button type="button" className={styles.buttonSecondary} onClick={() => void loadRfqs()} disabled={state.loading}>
            {state.loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link href="/products" className={styles.button}>
            Request New Quote
          </Link>
        </div>
      </div>

      {state.error ? <div className={styles.errorBox}>{state.error}</div> : null}

      {state.loading && !state.data.length ? <div className={styles.emptyState}>Loading RFQs...</div> : null}

      {!state.loading && !state.data.length ? (
        <div className={styles.emptyState}>
          No RFQs yet. Open a product card and request a quote to create the first one.
        </div>
      ) : null}

      <div className={styles.list}>
        {state.data.map((rfq) => {
          const product = rfq.productId ? productById.get(rfq.productId) : null;
          return (
            <article className={styles.rfqCard} key={rfq.id}>
              <div className={styles.rfqHead}>
                <div>
                  <div className={styles.title}>{productLabel(product) ?? rfq.productId ?? 'Unknown product'}</div>
                  <div className={styles.subtle}>Requested quantity: {rfq.qty}</div>
                  <div className={styles.inlineMeta}>
                    <span>RFQ ID: {rfq.id}</span>
                    <span>Created: {rfq.createdAt}</span>
                  </div>
                </div>
                <span className={`${styles.status} ${rfq.status === 'accepted' ? styles.statusSuccess : rfq.status === 'quoted' ? styles.statusWarning : ''}`}>
                  {rfq.status}
                </span>
              </div>

              <div className={styles.stack}>
                <div className={styles.subtle}>
                  {rfq.quotes?.length ? `${rfq.quotes.length} quote(s) attached.` : 'No quotes attached yet.'}
                </div>
                {rfq.quotes?.map((quote) => (
                  <div className={styles.quoteCard} key={quote.id}>
                    <div className={styles.rfqHead}>
                      <div>
                        <div className={styles.title}>Quote {quote.id}</div>
                        <div className={styles.inlineMeta}>
                          <span>
                            {quote.currency} {(quote.unitPrice / 100).toFixed(2)} / unit
                          </span>
                          <span>
                            total {quote.currency} {(quote.totalPrice / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`${styles.status} ${
                          quote.status === 'accepted'
                            ? styles.statusSuccess
                            : quote.status === 'rejected'
                              ? styles.statusError
                              : styles.statusWarning
                        }`}
                      >
                        {quote.status}
                      </span>
                    </div>
                    {quote.note ? <div className={styles.subtle}>{quote.note}</div> : null}
                    {quote.deal ? <div className={styles.successBox}>Deal created: {quote.deal.id}</div> : null}
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function QuotesBoard({
  products
}: {
  products: Product[];
}) {
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product] as const)),
    [products]
  );
  const [state, setState] = useState<LoadState<ContractRfq[]>>(loadingState([]));
  const [drafts, setDrafts] = useState<Record<string, { unitPrice: string; totalPrice: string; currency: string; note: string }>>({});

  async function loadInbox() {
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const data = await contractList<ContractRfq[]>('rfq/supplier-inbox');
      setState({ loading: false, data, error: null });
    } catch (requestError) {
      if (isAuthRedirectError(requestError)) {
        return;
      }

      setState({
        loading: false,
        data: [],
        error: requestError instanceof Error ? requestError.message : 'Unable to load supplier inbox.'
      });
    }
  }

  useEffect(() => {
    void loadInbox();
  }, []);

  function initDraft(rfq: ContractRfq) {
    const product = rfq.productId ? productById.get(rfq.productId) : null;
    const priceMinor = product?.prices?.[0]?.amountMinor ?? 100;
    const currency = product?.prices?.[0]?.currency ?? 'USD';

    return {
      unitPrice: String(priceMinor),
      totalPrice: String(priceMinor * rfq.qty),
      currency,
      note: ''
    };
  }

  async function submitQuote(rfq: ContractRfq) {
    const draft = drafts[rfq.id] ?? initDraft(rfq);

    try {
      await contractJson(`rfq/${rfq.id}/quotes`, {
        method: 'POST',
        body: JSON.stringify({
          unitPrice: Number(draft.unitPrice),
          totalPrice: Number(draft.totalPrice),
          currency: draft.currency,
          note: draft.note
        })
      });

      setDrafts((current) => ({ ...current, [rfq.id]: initDraft(rfq) }));
      await loadInbox();
    } catch (requestError) {
      if (isAuthRedirectError(requestError)) {
        return;
      }

      setState((current) => ({
        ...current,
        error: requestError instanceof Error ? requestError.message : 'Unable to submit quote.'
      }));
    }
  }

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div>
          <div className={styles.sectionTitle}>Supplier Inbox</div>
          <div className={styles.muted}>RFQs visible to the current supplier session.</div>
        </div>
        <div className={styles.buttonRow}>
          <button type="button" className={styles.buttonSecondary} onClick={() => void loadInbox()} disabled={state.loading}>
            {state.loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link href="/requests" className={styles.button}>
            View Buyer Requests
          </Link>
        </div>
      </div>

      {state.error ? <div className={styles.errorBox}>{state.error}</div> : null}

      {!state.loading && !state.data.length ? (
        <div className={styles.emptyState}>
          No supplier inbox items yet. Once a buyer creates an RFQ, it appears here for quoting.
        </div>
      ) : null}

      <div className={styles.list}>
        {state.data.map((rfq) => {
          const product = rfq.productId ? productById.get(rfq.productId) : null;
          const draft = drafts[rfq.id] ?? initDraft(rfq);

          return (
            <article className={styles.rfqCard} key={rfq.id}>
              <div className={styles.rfqHead}>
                <div>
                  <div className={styles.title}>{productLabel(product) ?? rfq.productId ?? 'Unknown product'}</div>
                  <div className={styles.inlineMeta}>
                    <span>Qty: {rfq.qty}</span>
                    <span>RFQ ID: {rfq.id}</span>
                  </div>
                </div>
                <span className={`${styles.status} ${rfq.status === 'quoted' ? styles.statusWarning : ''}`}>{rfq.status}</span>
              </div>

              <div className={styles.stack}>
                {rfq.quotes?.length ? (
                  <div className={styles.subtle}>
                    Existing quotes: {rfq.quotes.map((quote) => `${quote.currency} ${(quote.unitPrice / 100).toFixed(2)}`).join(', ')}
                  </div>
                ) : (
                  <div className={styles.subtle}>No quotes sent yet.</div>
                )}

                <div className={styles.fieldGrid}>
                  <div className={styles.field}>
                    <label htmlFor={`unit-${rfq.id}`}>Unit price</label>
                    <input
                      id={`unit-${rfq.id}`}
                      type="number"
                      min="1"
                      value={draft.unitPrice}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [rfq.id]: { ...draft, unitPrice: event.target.value }
                        }))
                      }
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor={`total-${rfq.id}`}>Total price</label>
                    <input
                      id={`total-${rfq.id}`}
                      type="number"
                      min="1"
                      value={draft.totalPrice}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [rfq.id]: { ...draft, totalPrice: event.target.value }
                        }))
                      }
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor={`currency-${rfq.id}`}>Currency</label>
                    <input
                      id={`currency-${rfq.id}`}
                      type="text"
                      value={draft.currency}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [rfq.id]: { ...draft, currency: event.target.value }
                        }))
                      }
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor={`note-${rfq.id}`}>Note</label>
                    <input
                      id={`note-${rfq.id}`}
                      type="text"
                      value={draft.note}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [rfq.id]: { ...draft, note: event.target.value }
                        }))
                      }
                    />
                  </div>
                </div>

                <div className={styles.buttonRow}>
                  <button type="button" className={styles.button} onClick={() => void submitQuote(rfq)}>
                    Send Quote
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function DealsBoard({
  products,
  viewerRoles
}: {
  products: Product[];
  viewerRoles: string[];
}) {
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product] as const)),
    [products]
  );
  const [quotesState, setQuotesState] = useState<LoadState<ContractQuote[]>>(loadingState([]));
  const [dealsState, setDealsState] = useState<LoadState<ContractDeal[]>>(loadingState([]));
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [paymentMethodDrafts, setPaymentMethodDrafts] = useState<Record<string, { method: ContractDealPaymentRecord['method'] }>>({});
  const [publicSettings, setPublicSettings] = useState<null | {
    governance?: {
      consent?: {
        dealFundingDocumentSlugs?: string[];
      };
    };
    legalDocuments?: Array<{ slug: string; title: string; version: string; href: string }>;
  }>(null);
  const [dealConsents, setDealConsents] = useState<Record<string, Record<string, boolean>>>({});

  async function loadBoard() {
    setQuotesState((current) => ({ ...current, loading: true, error: null }));
    setDealsState((current) => ({ ...current, loading: true, error: null }));
    setActionError(null);

    try {
      const [quotes, deals] = await Promise.all([
        contractList<ContractQuote[]>('quotes'),
        contractList<ContractDeal[]>('deals')
      ]);
      setQuotesState({ loading: false, data: quotes, error: null });
      setDealsState({ loading: false, data: deals, error: null });
    } catch (requestError) {
      if (isAuthRedirectError(requestError)) {
        return;
      }

      const message = requestError instanceof Error ? requestError.message : 'Unable to load board.';
      setQuotesState({ loading: false, data: [], error: message });
      setDealsState({ loading: false, data: [], error: message });
    }
  }

  useEffect(() => {
    void loadBoard();
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetch('/api/platform/public-settings', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return (await response.json()) as {
          governance?: {
            consent?: {
              dealFundingDocumentSlugs?: string[];
            };
          };
          legalDocuments?: Array<{ slug: string; title: string; version: string; href: string }>;
        };
      })
      .then((data) => {
        if (!cancelled && data) {
          setPublicSettings(data);
        }
      })
      .catch(() => {
        // Backend will still validate consent.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function acceptQuote(quoteId: string) {
    setActionError(null);
    setActionSuccess(null);

    try {
      await contractJson(`quotes/${quoteId}/accept`, {
        method: 'POST'
      });
      setActionSuccess(`Quote ${quoteId} accepted and deal created.`);
      await loadBoard();
    } catch (requestError) {
      if (isAuthRedirectError(requestError)) {
        return;
      }

      setActionError(requestError instanceof Error ? requestError.message : 'Unable to accept quote.');
    }
  }

  async function progressDeal(dealId: string, action: 'fund' | 'ship' | 'confirm') {
    setActionError(null);
    setActionSuccess(null);

    const requiredDocuments =
      action === 'fund'
        ? (publicSettings?.legalDocuments ?? []).filter((document) =>
            (publicSettings?.governance?.consent?.dealFundingDocumentSlugs ?? []).includes(document.slug)
          )
        : [];

    if (action === 'fund') {
      for (const document of requiredDocuments) {
        if (!dealConsents[dealId]?.[document.slug]) {
          setActionError(`Consent is required for ${document.title}.`);
          return;
        }
      }
    }

    try {
      await contractJson(`deals/${dealId}/${action}`, {
        method: 'POST',
        ...(action === 'fund'
          ? {
              body: JSON.stringify({
                consents: requiredDocuments.map((document) => ({
                  documentSlug: document.slug,
                  version: document.version
                }))
              })
            }
          : {})
      });
      setActionSuccess(
        action === 'fund'
          ? `Funding request submitted for deal ${dealId}.`
          : `Deal ${dealId} updated: ${action}.`
      );
      await loadBoard();
    } catch (requestError) {
      if (isAuthRedirectError(requestError)) {
        return;
      }

      setActionError(requestError instanceof Error ? requestError.message : 'Unable to update deal.');
    }
  }

  async function selectDealPaymentMethod(dealId: string, method: ContractDealPaymentRecord['method']) {
    setActionError(null);
    setActionSuccess(null);

    try {
      await contractJson(`deals/${dealId}/payment-method`, {
        method: 'POST',
        body: JSON.stringify({
          method,
          provider: method === 'manual' ? 'internal_manual' : 'airwallex'
        })
      });
      setPaymentMethodDrafts((current) => ({
        ...current,
        [dealId]: { method }
      }));
      setActionSuccess(`Deal ${dealId} payment instructions issued for ${dealPaymentMethodLabel(method)}.`);
      await loadBoard();
    } catch (requestError) {
      if (isAuthRedirectError(requestError)) {
        return;
      }

      setActionError(requestError instanceof Error ? requestError.message : 'Unable to set deal payment method.');
    }
  }

  const canFund = viewerRoles.includes('customer_user');
  const canShip = viewerRoles.includes('supplier_user') || viewerRoles.includes('platform_admin');
  const canConfirm = viewerRoles.includes('customer_user');

  return (
    <div className={styles.grid}>
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>Buyer Quotes</div>
            <div className={styles.muted}>Accept a quote to create the deal.</div>
          </div>
          <div className={styles.buttonRow}>
            <button type="button" className={styles.buttonSecondary} onClick={() => void loadBoard()} disabled={quotesState.loading || dealsState.loading}>
              {quotesState.loading || dealsState.loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <Link href="/quotes" className={styles.button}>
              Open Supplier Inbox
            </Link>
          </div>
        </div>

        {quotesState.error ? <div className={styles.errorBox}>{quotesState.error}</div> : null}
        {actionError ? <div className={styles.errorBox}>{actionError}</div> : null}
        {actionSuccess ? <div className={styles.successBox}>{actionSuccess}</div> : null}

        {!quotesState.loading && !quotesState.data.length ? (
          <div className={styles.emptyState}>No quotes yet. A supplier must send a quote first.</div>
        ) : null}

        <div className={styles.quoteList}>
          {quotesState.data.map((quote) => {
            const product = quote.rfq?.productId ? productById.get(quote.rfq.productId) : null;
            const canAccept = quote.status !== 'accepted';
            return (
              <article className={styles.quoteCard} key={quote.id}>
                <div className={styles.quoteHead}>
                  <div>
                    <div className={styles.title}>{productLabel(product) ?? quote.rfqId}</div>
                    <div className={styles.inlineMeta}>
                      <span>
                        {quote.currency} {(quote.unitPrice / 100).toFixed(2)} / unit
                      </span>
                      <span>
                        total {quote.currency} {(quote.totalPrice / 100).toFixed(2)}
                      </span>
                      <span>RFQ qty: {quote.rfq?.qty ?? 'unknown'}</span>
                    </div>
                  </div>
                  <span className={`${styles.status} ${quote.status === 'accepted' ? styles.statusSuccess : styles.statusWarning}`}>
                    {quote.status}
                  </span>
                </div>
                {quote.note ? <div className={styles.subtle}>{quote.note}</div> : null}
                <div className={styles.buttonRow}>
                  <button type="button" className={styles.button} onClick={() => void acceptQuote(quote.id)} disabled={!canAccept}>
                    Accept Quote
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>Deals</div>
            <div className={styles.muted}>Accepted quotes become deals.</div>
          </div>
        </div>

        {dealsState.error ? <div className={styles.errorBox}>{dealsState.error}</div> : null}

        {!dealsState.loading && !dealsState.data.length ? <div className={styles.emptyState}>No deals yet.</div> : null}

        <div className={styles.dealList}>
          {dealsState.data.map((deal) => {
            const product = deal.rfq?.productId ? productById.get(deal.rfq.productId) : null;
            const paymentRecord = deal.paymentRecords?.[0] ?? null;
            const paymentInstructionRows = dealPaymentInstructionEntries(paymentRecord);
            const amountLabel =
              deal.quote?.currency && deal.quote?.totalPrice
                ? `${deal.quote.currency} ${(deal.quote.totalPrice / 100).toFixed(2)}`
                : deal.quote?.currency
                  ? `${deal.quote.currency} —`
                  : 'Amount unavailable';
            const actionButton =
              deal.dealStatus === 'accepted' && canFund ? (
                <div className={styles.stack}>
                  {(publicSettings?.legalDocuments ?? [])
                    .filter((document) => (publicSettings?.governance?.consent?.dealFundingDocumentSlugs ?? []).includes(document.slug))
                    .map((document) => (
                      <label key={`${deal.id}-${document.slug}`} className={styles.subtle} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <input
                          type="checkbox"
                          checked={dealConsents[deal.id]?.[document.slug] ?? false}
                          onChange={(event) =>
                            setDealConsents((current) => ({
                              ...current,
                              [deal.id]: {
                                ...(current[deal.id] ?? {}),
                                [document.slug]: event.target.checked
                              }
                            }))
                          }
                        />
                        <span>
                          I agree to the{' '}
                          <Link href={document.href} target="_blank">
                            {document.title}
                          </Link>
                          .
                        </span>
                      </label>
                    ))}
                  <button type="button" className={styles.buttonSecondary} onClick={() => void progressDeal(deal.id, 'fund')}>
                    Submit Funding Request
                  </button>
                </div>
              ) : deal.dealStatus === 'in_escrow' && canShip ? (
                <button type="button" className={styles.buttonSecondary} onClick={() => void progressDeal(deal.id, 'ship')}>
                  Mark Shipped
                </button>
              ) : deal.dealStatus === 'shipped' && canConfirm ? (
                <button type="button" className={styles.button} onClick={() => void progressDeal(deal.id, 'confirm')}>
                  Confirm Delivery
                </button>
              ) : null;

            return (
              <article className={styles.dealCard} key={deal.id}>
                <div className={styles.dealHead}>
                  <div>
                    <div className={styles.title}>{productLabel(product) ?? deal.rfqId}</div>
                    <div className={styles.inlineMeta}>
                      <span>Deal ID: {deal.id}</span>
                      <span>Quote ID: {deal.quoteId ?? 'n/a'}</span>
                    </div>
                  </div>
                  <span className={`${styles.status} ${deal.dealStatus === 'completed' ? styles.statusSuccess : styles.statusWarning}`}>
                    {deal.dealStatus}
                  </span>
                </div>

                <div className={styles.inlineMeta}>
                  <span>Buyer: {deal.buyerStatus}</span>
                  <span>Supplier: {deal.supplierStatus}</span>
                  <span>Amount: {amountLabel}</span>
                </div>

                <div className={styles.stack}>
                  <div className={styles.subtle}>Payment</div>
                  {paymentRecord ? (
                    <div className={styles.stack}>
                      <div className={styles.inlineMeta}>
                        <span>Method: {dealPaymentMethodLabel(paymentRecord.method)}</span>
                        <span>Provider: {dealPaymentProviderLabel(paymentRecord.provider)}</span>
                        <span className={dealPaymentStatusClass(paymentRecord.status)}>{paymentRecord.status}</span>
                      </div>
                      <div className={styles.inlineMeta}>
                        <span>Reference: {paymentRecord.paymentReference ?? 'n/a'}</span>
                        <span>Transaction: {paymentRecord.transactionId ?? 'n/a'}</span>
                        <span>Bank ref: {paymentRecord.bankReference ?? 'n/a'}</span>
                      </div>
                      {paymentInstructionRows.length ? (
                        <div className={styles.sectionCard} style={{ padding: 12, background: '#fff' }}>
                          <div className={styles.subtle}>Payment instructions</div>
                          <div className={styles.list}>
                            {paymentInstructionRows.map(([key, value]) => (
                              <div className={styles.inlineMeta} key={key}>
                                <span>{key}</span>
                                <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className={styles.subtle}>No payment record yet. The buyer can choose a payment rail first.</div>
                  )}
                </div>

                <div className={styles.stack}>
                  <div className={styles.subtle}>Timeline</div>
                  <div className={styles.inlineMeta}>
                    <span className={`${styles.status} ${deal.dealStatus === 'accepted' ? styles.statusSuccess : ''}`}>Accepted</span>
                    <span className={`${styles.status} ${deal.dealStatus === 'in_escrow' ? styles.statusWarning : ''}`}>In escrow</span>
                    <span className={`${styles.status} ${deal.dealStatus === 'shipped' ? styles.statusWarning : ''}`}>Shipped</span>
                    <span className={`${styles.status} ${deal.dealStatus === 'completed' ? styles.statusSuccess : ''}`}>Completed</span>
                  </div>
                </div>

                {deal.dealStatus === 'accepted' && canFund ? (
                  <div className={styles.stack}>
                    <div className={styles.subtle}>Choose payment rail</div>
                    <div className={styles.buttonRow}>
                      {(['swift', 'iban_invoice', 'bank_transfer', 'manual'] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          className={paymentMethodDrafts[deal.id]?.method === method ? styles.button : styles.buttonSecondary}
                          onClick={() => void selectDealPaymentMethod(deal.id, method)}
                        >
                          {dealPaymentMethodLabel(method)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className={styles.buttonRow}>
                  <Link href={`/invoice/${deal.id}`} className={styles.buttonSecondary}>
                    Open Invoice
                  </Link>
                  {actionButton}
                </div>
                {!actionButton ? <div className={styles.subtle}>No further action available.</div> : null}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
