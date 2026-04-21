'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './core-flow.module.css';

type Product = {
  id: string;
  slug: string;
  name: string;
  targetMarket: string;
  status: string;
  description?: string | null;
  prices?: Array<{ amountMinor: number; currency: string }>;
  category?: { name?: string | null };
  sellerProfile?: { displayName?: string | null };
};

type RetailOrderItem = {
  id: string;
  productId: string;
  quantity: number;
  unitAmountMinor: number;
  lineAmountMinor: number;
  currency: string;
  productName: string;
  productSlug: string;
  product?: Product & {
    prices?: Array<{ amountMinor: number; currency: string }>;
  };
};

type RetailPaymentAttempt = {
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

type RetailPaymentRecord = {
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
  attempts?: RetailPaymentAttempt[];
};

type RetailOrder = {
  id: string;
  buyerProfileId: string;
  supplierProfileId: string | null;
  status: 'created' | 'pending' | 'paid' | 'shipped' | 'delivered' | 'fulfilled' | 'cancelled';
  paymentStatus:
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
  paymentTransactionId: string | null;
  paymentRecords?: RetailPaymentRecord[];
  shippingAddress?: Record<string, string> | null;
  currency: string;
  totalAmountMinor: number;
  createdAt: string;
  updatedAt: string;
  buyerProfile?: { displayName?: string | null; user?: { email?: string | null } | null } | null;
  supplierProfile?: { displayName?: string | null; user?: { email?: string | null } | null } | null;
  items: RetailOrderItem[];
};

type HistoryEvent = {
  id: string;
  module: string;
  eventType: string;
  actorId: string | null;
  tenantId: string | null;
  subjectType: string | null;
  subjectId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

type LoadState<T> = {
  loading: boolean;
  data: T;
  error: string | null;
};

type MarketplaceRole = 'guest' | 'buyer' | 'supplier' | 'logistics' | 'customs' | 'admin';

function loadingState<T>(data: T): LoadState<T> {
  return { loading: true, data, error: null };
}

function redirectToSignIn() {
  if (typeof window === 'undefined') {
    return;
  }

  const returnTo = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/signin?returnTo=${encodeURIComponent(returnTo)}`);
}

function authRedirectError() {
  const error = new Error('Your session is no longer valid. Please sign in again.');
  error.name = 'AuthRedirectError';
  return error;
}

function isAuthRedirectError(error: unknown) {
  return error instanceof Error && error.name === 'AuthRedirectError';
}

async function retailJson<T>(path: string, init?: RequestInit) {
  const hasBody = init?.body !== undefined && init?.body !== null;
  const response = await fetch(`/api/retail/${path}`, {
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
    if (response.status === 401 || response.status === 403) {
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

function money(value: number, currency: string) {
  return `${currency} ${(value / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function addressLabel(address?: Record<string, string> | null) {
  if (!address) {
    return 'No shipping address';
  }

  return [address.name, address.line1, address.line2, `${address.city}, ${address.region}`, address.country, address.postalCode]
    .filter(Boolean)
    .join(' • ');
}

function paymentMethodLabel(method?: RetailPaymentRecord['method'] | null) {
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

function paymentProviderLabel(provider?: RetailPaymentRecord['provider'] | null) {
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

function paymentProviderForMethod(method: RetailPaymentRecord['method']) {
  return method === 'card' || method === 'qr' ? 'airwallex' : 'internal_manual';
}

function paymentStatusTone(status?: RetailPaymentRecord['status'] | null) {
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

function paymentInstructionEntries(record?: RetailPaymentRecord | null) {
  if (!record || !record.instructions || typeof record.instructions !== 'object' || Array.isArray(record.instructions)) {
    return [];
  }

  return Object.entries(record.instructions as Record<string, unknown>).filter(([, value]) => value !== undefined && value !== null && value !== '');
}

export function AddToCartButton({
  product,
  viewerRole
}: {
  product: Product;
  viewerRole: MarketplaceRole;
}) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (viewerRole === 'guest') {
    return (
      <div className={styles.stack}>
        <div className={styles.subtle}>Sign in to add this product to your cart.</div>
        <div className={styles.buttonRow}>
          <Link href={`/signin?returnTo=/products/${product.slug}`} className={styles.button}>
            Sign In
          </Link>
          <Link href="/cart" className={styles.buttonSecondary}>
            Open Cart
          </Link>
        </div>
      </div>
    );
  }

  if (viewerRole === 'supplier') {
    return (
      <div className={styles.stack}>
        <div className={styles.subtle}>Supplier accounts manage RFQs and orders, not consumer cart checkout.</div>
        <div className={styles.buttonRow}>
          <Link href="/quotes" className={styles.button}>
            Open RFQ Inbox
          </Link>
          <Link href="/orders" className={styles.buttonSecondary}>
            Open Orders
          </Link>
        </div>
      </div>
    );
  }

  async function addToCart() {
    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      await retailJson<{ id: string }>('orders/cart/items', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          quantity: 1
        })
      });

      setSuccess('Added to cart.');
    } catch (requestError) {
      if (isAuthRedirectError(requestError)) {
        return;
      }

      setError(requestError instanceof Error ? requestError.message : 'Unable to add to cart.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.stack}>
      <div className={styles.buttonRow}>
        <button type="button" className={styles.button} onClick={() => void addToCart()} disabled={loading}>
          {loading ? 'Adding...' : 'Add to Cart'}
        </button>
        <Link href="/cart" className={styles.buttonSecondary}>
          Open Cart
        </Link>
      </div>
      {success ? <div className={styles.successBox}>{success}</div> : null}
      {error ? <div className={styles.errorBox}>{error}</div> : null}
    </div>
  );
}

export function RetailCartBoard({ viewerRole }: { viewerRole: MarketplaceRole }) {
  const [cartState, setCartState] = useState<LoadState<RetailOrder | null>>(loadingState(null));

  async function loadCart() {
    setCartState((current) => ({ ...current, loading: true, error: null }));

    try {
      const data = await retailJson<RetailOrder | null>('orders/cart');
      setCartState({ loading: false, data, error: null });
    } catch (requestError) {
      if (isAuthRedirectError(requestError)) {
        return;
      }

      setCartState({
        loading: false,
        data: null,
        error: requestError instanceof Error ? requestError.message : 'Unable to load cart.'
      });
    }
  }

  useEffect(() => {
    void loadCart();
  }, []);

  async function updateQuantity(itemId: string, quantity: number) {
    try {
      await retailJson<RetailOrder>(`orders/cart/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity })
      });
      await loadCart();
    } catch (requestError) {
      if (isAuthRedirectError(requestError)) {
        return;
      }

      setCartState((current) => ({
        ...current,
        error: requestError instanceof Error ? requestError.message : 'Unable to update cart item.'
      }));
    }
  }

  async function removeItem(itemId: string) {
    try {
      await retailJson<RetailOrder>(`orders/cart/items/${itemId}`, {
        method: 'DELETE'
      });
      await loadCart();
    } catch (requestError) {
      if (isAuthRedirectError(requestError)) {
        return;
      }

      setCartState((current) => ({
        ...current,
        error: requestError instanceof Error ? requestError.message : 'Unable to remove cart item.'
      }));
    }
  }

  if (viewerRole === 'guest') {
    return (
      <div className={styles.sectionCard}>
        <div className={styles.sectionTitle}>Sign in to see your cart.</div>
        <div className={styles.subtle}>Cart state is tied to the authenticated buyer session.</div>
        <div className={styles.buttonRow} style={{ marginTop: 12 }}>
          <Link href="/signin?returnTo=/cart" className={styles.button}>
            Sign In
          </Link>
          <Link href="/products" className={styles.buttonSecondary}>
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div>
          <div className={styles.sectionTitle}>Cart</div>
          <div className={styles.muted}>Your cart is persisted server-side and stays linked to the buyer session.</div>
        </div>
        <div className={styles.buttonRow}>
          <button type="button" className={styles.buttonSecondary} onClick={() => void loadCart()} disabled={cartState.loading}>
            {cartState.loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link href="/products" className={styles.button}>
            Add More Items
          </Link>
        </div>
      </div>

      {cartState.error ? <div className={styles.errorBox}>{cartState.error}</div> : null}

      {!cartState.loading && !cartState.data ? (
        <div className={styles.emptyState}>No cart yet. Add a product to create one.</div>
      ) : null}

      {!cartState.loading && cartState.data && !cartState.data.items.length ? (
        <div className={styles.emptyState}>Your cart is empty. Add a product to continue.</div>
      ) : null}

      {cartState.data ? (
        <div className={styles.stack}>
          <div className={styles.inlineMeta}>
            <span>Cart ID: {cartState.data.id}</span>
            <span>Status: {cartState.data.status}</span>
            <span>Payment: {cartState.data.paymentStatus}</span>
            <span>Supplier: {cartState.data.supplierProfile?.displayName ?? 'Not assigned yet'}</span>
          </div>

          <div className={styles.list}>
            {cartState.data.items.map((item) => (
              <article className={styles.quoteCard} key={item.id}>
                <div className={styles.rfqHead}>
                  <div>
                    <div className={styles.title}>{item.productName}</div>
                    <div className={styles.inlineMeta}>
                      <span>SKU: {item.productSlug}</span>
                      <span>
                        {money(item.unitAmountMinor, item.currency)} each
                      </span>
                      <span>
                        Line: {money(item.lineAmountMinor, item.currency)}
                      </span>
                    </div>
                  </div>
                  <div className={styles.buttonRow}>
                    <button type="button" className={styles.buttonSecondary} onClick={() => void updateQuantity(item.id, item.quantity + 1)}>
                      +1
                    </button>
                    <button type="button" className={styles.buttonSecondary} onClick={() => void updateQuantity(item.id, Math.max(1, item.quantity - 1))}>
                      -1
                    </button>
                    <button type="button" className={styles.buttonDanger} onClick={() => void removeItem(item.id)}>
                      Remove
                    </button>
                  </div>
                </div>
                <div className={styles.subtle}>Quantity: {item.quantity}</div>
              </article>
            ))}
          </div>

          <div className={styles.sectionCard} style={{ padding: 16, background: '#f8fafc' }}>
            <div className={styles.inlineMeta}>
              <span>Total: {money(cartState.data.totalAmountMinor, cartState.data.currency)}</span>
              <span>Payment transaction: {cartState.data.paymentTransactionId ?? 'n/a'}</span>
            </div>
            <div className={styles.buttonRow} style={{ marginTop: 12 }}>
              <Link href="/checkout" className={styles.button}>
                Proceed to Checkout
              </Link>
              <Link href="/orders" className={styles.buttonSecondary}>
                View Orders
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function RetailCheckoutBoard({ viewerRole }: { viewerRole: MarketplaceRole }) {
  const [orderState, setOrderState] = useState<LoadState<RetailOrder | null>>(loadingState(null));
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publicSettings, setPublicSettings] = useState<null | {
    governance?: {
      consent?: {
        checkoutDocumentSlugs?: string[];
      };
    };
    legalDocuments?: Array<{ slug: string; title: string; version: string; href: string }>;
  }>(null);
  const [acceptedCheckoutConsents, setAcceptedCheckoutConsents] = useState<Record<string, boolean>>({});
  const [paymentMethod, setPaymentMethod] = useState<RetailPaymentRecord['method']>('card');
  const [cardForm, setCardForm] = useState({
    cardholderName: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvc: ''
  });
  const [address, setAddress] = useState({
    name: '',
    line1: '',
    line2: '',
    city: '',
    region: '',
    country: 'USA',
    postalCode: '',
    phone: ''
  });

  async function loadCart() {
    setOrderState((current) => ({ ...current, loading: true, error: null }));

    try {
      const data = await retailJson<RetailOrder | null>('orders/current');
      setOrderState({ loading: false, data, error: null });
    } catch (requestError) {
      if (isAuthRedirectError(requestError)) {
        return;
      }

      setOrderState({
        loading: false,
        data: null,
        error: requestError instanceof Error ? requestError.message : 'Unable to load cart.'
      });
    }
  }

  useEffect(() => {
    void loadCart();
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
              checkoutDocumentSlugs?: string[];
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

  async function checkout() {
    if (!orderState.data) {
      setError('No cart is available.');
      return;
    }

    setSuccess(null);
    setError(null);

    const consentDocuments = (publicSettings?.legalDocuments ?? []).filter((document) =>
      (publicSettings?.governance?.consent?.checkoutDocumentSlugs ?? []).includes(document.slug)
    );

    for (const document of consentDocuments) {
      if (!acceptedCheckoutConsents[document.slug]) {
        setError(`Consent is required for ${document.title}.`);
        return;
      }
    }

    try {
      await retailJson<RetailOrder>(`orders/${orderState.data.id}/checkout`, {
        method: 'POST',
        body: JSON.stringify({
          ...address,
          paymentMethod,
          paymentProvider: paymentProviderForMethod(paymentMethod),
          consents: consentDocuments.map((document) => ({
            documentSlug: document.slug,
            version: document.version
          }))
        })
      });
      setSuccess('Checkout created. Payment instructions are ready.');
      await loadCart();
    } catch (requestError) {
      if (isAuthRedirectError(requestError)) {
        return;
      }

      setError(requestError instanceof Error ? requestError.message : 'Unable to checkout.');
    }
  }

  async function selectPaymentMethod(method: RetailPaymentRecord['method']) {
    setPaymentMethod(method);
    setSuccess(null);
    setError(null);
  }

  async function submitPayment() {
    if (!orderState.data) {
      setError('No order is available.');
      return;
    }

    const paymentRecordMethod = orderState.data.paymentRecords?.[0]?.method ?? paymentMethod;

    if (
      paymentRecordMethod === 'card' &&
      (!cardForm.cardholderName || !cardForm.cardNumber || !cardForm.expiryMonth || !cardForm.expiryYear || !cardForm.cvc)
    ) {
      setError('Complete the card form before submitting payment.');
      return;
    }

    setSuccess(null);
    setError(null);

    try {
      await retailJson<RetailOrder>(`orders/${orderState.data.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          note:
            paymentRecordMethod === 'card' ? 'Buyer submitted card payment from the checkout flow.' : 'Buyer submitted payment from the checkout flow.',
          ...(paymentRecordMethod === 'card' ? { card: cardForm } : {})
        })
      });
      setSuccess('Payment submitted. Awaiting confirmation.');
      await loadCart();
    } catch (requestError) {
      if (isAuthRedirectError(requestError)) {
        return;
      }

      setError(requestError instanceof Error ? requestError.message : 'Unable to update payment.');
    }
  }

  if (viewerRole === 'guest') {
    return (
      <div className={styles.sectionCard}>
        <div className={styles.sectionTitle}>Sign in to checkout.</div>
        <div className={styles.subtle}>Checkout uses the authenticated buyer cart and payment state.</div>
        <div className={styles.buttonRow} style={{ marginTop: 12 }}>
          <Link href="/signin?returnTo=/checkout" className={styles.button}>
            Sign In
          </Link>
          <Link href="/cart" className={styles.buttonSecondary}>
            Open Cart
          </Link>
        </div>
      </div>
    );
  }

  const order = orderState.data;
  const checkoutConsentDocuments = (publicSettings?.legalDocuments ?? []).filter((document) =>
    (publicSettings?.governance?.consent?.checkoutDocumentSlugs ?? []).includes(document.slug)
  );

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div>
          <div className={styles.sectionTitle}>Checkout</div>
          <div className={styles.muted}>Address, place order, payment, and delivery all live in one flow.</div>
        </div>
        <div className={styles.buttonRow}>
          <button type="button" className={styles.buttonSecondary} onClick={() => void loadCart()} disabled={orderState.loading}>
            {orderState.loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link href="/cart" className={styles.button}>
            Back to Cart
          </Link>
        </div>
      </div>

      {orderState.error ? <div className={styles.errorBox}>{orderState.error}</div> : null}
      {error ? <div className={styles.errorBox}>{error}</div> : null}
      {success ? <div className={styles.successBox}>{success}</div> : null}

      {!order ? <div className={styles.emptyState}>No cart yet. Add products first.</div> : null}

      {order ? (
        <div className={styles.stack}>
          <div className={styles.inlineMeta}>
            <span>Order: {order.id}</span>
            <span>Status: {order.status}</span>
            <span>Payment: {order.paymentStatus}</span>
            <span>Transaction: {order.paymentTransactionId ?? 'pending'}</span>
          </div>
          {order.status === 'created' ? (
            <div className={styles.sectionCard} style={{ padding: 16, background: '#f8fafc' }}>
              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <label htmlFor="checkout-name">Full name</label>
                  <input id="checkout-name" value={address.name} onChange={(event) => setAddress((current) => ({ ...current, name: event.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="checkout-phone">Phone</label>
                  <input id="checkout-phone" value={address.phone} onChange={(event) => setAddress((current) => ({ ...current, phone: event.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="checkout-line1">Address line 1</label>
                  <input id="checkout-line1" value={address.line1} onChange={(event) => setAddress((current) => ({ ...current, line1: event.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="checkout-line2">Address line 2</label>
                  <input id="checkout-line2" value={address.line2} onChange={(event) => setAddress((current) => ({ ...current, line2: event.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="checkout-city">City</label>
                  <input id="checkout-city" value={address.city} onChange={(event) => setAddress((current) => ({ ...current, city: event.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="checkout-region">Region</label>
                  <input id="checkout-region" value={address.region} onChange={(event) => setAddress((current) => ({ ...current, region: event.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="checkout-country">Country</label>
                  <input id="checkout-country" value={address.country} onChange={(event) => setAddress((current) => ({ ...current, country: event.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="checkout-postal">Postal code</label>
                  <input id="checkout-postal" value={address.postalCode} onChange={(event) => setAddress((current) => ({ ...current, postalCode: event.target.value }))} />
                </div>
              </div>
              <div className={styles.stack}>
                <div className={styles.subtle}>Choose payment method</div>
                <div className={styles.buttonRow}>
                  {(['card', 'qr', 'bank_transfer', 'swift', 'manual'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      className={paymentMethod === method ? styles.button : styles.buttonSecondary}
                      onClick={() => void selectPaymentMethod(method)}
                    >
                      {paymentMethodLabel(method)}
                    </button>
                  ))}
                </div>
                <div className={styles.subtle}>
                  {paymentMethod === 'card'
                    ? 'Card checkout will create an Airwallex-ready payment session with masked card submission.'
                    : paymentMethod === 'qr'
                      ? 'QR payment will create scan-ready instructions and a payment reference.'
                      : paymentMethod === 'bank_transfer'
                        ? 'Bank transfer will show beneficiary, bank, and reference instructions.'
                        : paymentMethod === 'swift'
                          ? 'SWIFT transfer will show beneficiary, IBAN, SWIFT/BIC, and transfer references.'
                        : 'Manual payment will wait for admin or supplier confirmation.'}
                </div>
                {paymentMethod === 'card' ? (
                  <div className={styles.fieldGrid}>
                    <div className={styles.field}>
                      <label htmlFor="cardholder-name">Cardholder name</label>
                      <input
                        id="cardholder-name"
                        value={cardForm.cardholderName}
                        onChange={(event) => setCardForm((current) => ({ ...current, cardholderName: event.target.value }))}
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="card-number">Card number</label>
                      <input
                        id="card-number"
                        inputMode="numeric"
                        value={cardForm.cardNumber}
                        onChange={(event) => setCardForm((current) => ({ ...current, cardNumber: event.target.value }))}
                        placeholder="4111 1111 1111 1111"
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="card-expiry-month">Expiry month</label>
                      <input
                        id="card-expiry-month"
                        inputMode="numeric"
                        value={cardForm.expiryMonth}
                        onChange={(event) => setCardForm((current) => ({ ...current, expiryMonth: event.target.value }))}
                        placeholder="12"
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="card-expiry-year">Expiry year</label>
                      <input
                        id="card-expiry-year"
                        inputMode="numeric"
                        value={cardForm.expiryYear}
                        onChange={(event) => setCardForm((current) => ({ ...current, expiryYear: event.target.value }))}
                        placeholder="2028"
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="card-cvc">CVC</label>
                      <input
                        id="card-cvc"
                        inputMode="numeric"
                        value={cardForm.cvc}
                        onChange={(event) => setCardForm((current) => ({ ...current, cvc: event.target.value }))}
                        placeholder="123"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
              {checkoutConsentDocuments.length ? (
                <div className={styles.sectionCard} style={{ padding: 12, background: '#fff' }}>
                  <div className={styles.subtle}>Required consent</div>
                  <div className={styles.stack}>
                    {checkoutConsentDocuments.map((document) => (
                      <label key={document.slug} className={styles.subtle} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <input
                          type="checkbox"
                          checked={acceptedCheckoutConsents[document.slug] ?? false}
                          onChange={(event) =>
                            setAcceptedCheckoutConsents((current) => ({
                              ...current,
                              [document.slug]: event.target.checked
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
                  </div>
                </div>
              ) : null}
              <div className={styles.buttonRow} style={{ marginTop: 16 }}>
                <button type="button" className={styles.button} onClick={() => void checkout()} disabled={orderState.loading}>
                  Place Order
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>Order already placed. Move to payment or back to cart if you need to change items.</div>
          )}

          {order.status !== 'created' ? (
            <div className={styles.sectionCard} style={{ padding: 16, background: '#f8fafc' }}>
              <div className={styles.inlineMeta}>
                <span>Total: {money(order.totalAmountMinor, order.currency)}</span>
                <span>Supplier: {order.supplierProfile?.displayName ?? 'Not assigned yet'}</span>
                <span>Shipping address: {addressLabel(order.shippingAddress)}</span>
              </div>
              {order.paymentRecords?.[0] ? (
                <div className={styles.stack} style={{ marginTop: 12 }}>
                  <div className={styles.inlineMeta}>
                    <span>Method: {paymentMethodLabel(order.paymentRecords[0].method)}</span>
                    <span>Provider: {paymentProviderLabel(order.paymentRecords[0].provider)}</span>
                    <span>Payment status: {order.paymentRecords[0].status}</span>
                  </div>
                  <div className={styles.inlineMeta}>
                    <span>Reference: {order.paymentRecords[0].paymentReference ?? 'n/a'}</span>
                    <span>Transaction: {order.paymentRecords[0].transactionId ?? 'n/a'}</span>
                    <span>Bank ref: {order.paymentRecords[0].bankReference ?? 'n/a'}</span>
                  </div>
                  {paymentInstructionEntries(order.paymentRecords[0]).length ? (
                    <div className={styles.sectionCard} style={{ padding: 12, background: '#fff' }}>
                      <div className={styles.subtle}>Payment instructions</div>
                      <div className={styles.list}>
                        {paymentInstructionEntries(order.paymentRecords[0]).map(([key, value]) => (
                          <div className={styles.inlineMeta} key={key}>
                            <span>{key}</span>
                            <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className={styles.buttonRow} style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => void submitPayment()}
                  disabled={orderState.loading || order.paymentStatus === 'paid'}
                >
                  {order.paymentStatus === 'paid' ? 'Payment Already Confirmed' : 'Submit Payment'}
                </button>
                <Link href={`/orders/${order.id}/payment`} className={styles.buttonSecondary}>
                  Open Payment Page
                </Link>
              </div>
            </div>
          ) : null}

          <div className={styles.emptyState}>
            Buyer can place the order, submit the payment notice, and keep the payment transaction visible in the order record.
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function RetailOrdersBoard({
  viewerRole
}: {
  viewerRole: MarketplaceRole;
}) {
  const [ordersState, setOrdersState] = useState<LoadState<RetailOrder[]>>(loadingState([]));

  if (viewerRole === 'guest') {
    return (
      <div className={styles.sectionCard}>
        <div className={styles.sectionTitle}>Sign in to view orders.</div>
        <div className={styles.subtle}>Order history is tied to the authenticated buyer or supplier session.</div>
        <div className={styles.buttonRow} style={{ marginTop: 12 }}>
          <Link href="/signin?returnTo=/orders" className={styles.button}>
            Sign In
          </Link>
          <Link href="/register/buyer" className={styles.buttonSecondary}>
            Register
          </Link>
        </div>
      </div>
    );
  }

  async function loadOrders() {
    setOrdersState((current) => ({ ...current, loading: true, error: null }));

    try {
      const data = await retailJson<RetailOrder[]>('orders');
      setOrdersState({ loading: false, data, error: null });
    } catch (requestError) {
      if (isAuthRedirectError(requestError)) {
        return;
      }

      setOrdersState({
        loading: false,
        data: [],
        error: requestError instanceof Error ? requestError.message : 'Unable to load orders.'
      });
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  async function transition(orderId: string, action: 'pay' | 'ship' | 'confirm') {
    try {
      const init: RequestInit = { method: 'POST' };
      if (action === 'pay') {
        init.body = JSON.stringify({});
      }

      await retailJson<RetailOrder>(`orders/${orderId}/${action}`, init);
      await loadOrders();
    } catch (requestError) {
      if (isAuthRedirectError(requestError)) {
        return;
      }

      setOrdersState((current) => ({
        ...current,
        error: requestError instanceof Error ? requestError.message : `Unable to ${action} order.`
      }));
    }
  }

  const canBuy = viewerRole === 'buyer' || viewerRole === 'admin';
  const canShip = viewerRole === 'supplier' || viewerRole === 'admin';

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div>
          <div className={styles.sectionTitle}>Orders</div>
          <div className={styles.muted}>Buyer sees own orders, supplier sees fulfillment, admin sees everything.</div>
        </div>
        <div className={styles.buttonRow}>
          <button type="button" className={styles.buttonSecondary} onClick={() => void loadOrders()} disabled={ordersState.loading}>
            {ordersState.loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link href="/cart" className={styles.button}>
            Open Cart
          </Link>
        </div>
      </div>

      {ordersState.error ? <div className={styles.errorBox}>{ordersState.error}</div> : null}

      {!ordersState.loading && !ordersState.data.length ? (
        <div className={styles.emptyState}>No orders yet. Checkout a cart to create the first order.</div>
      ) : null}

      <div className={styles.list}>
        {ordersState.data.map((order) => {
          const action =
            order.status === 'pending' && canBuy ? (
              <button type="button" className={styles.button} onClick={() => void transition(order.id, 'pay')}>
                Pay
              </button>
            ) : order.status === 'paid' && canShip ? (
              <button type="button" className={styles.buttonSecondary} onClick={() => void transition(order.id, 'ship')}>
                Mark Shipped
              </button>
            ) : order.status === 'shipped' && canBuy ? (
              <button type="button" className={styles.button} onClick={() => void transition(order.id, 'confirm')}>
                Confirm Delivery
              </button>
            ) : null;

          return (
            <article className={styles.dealCard} key={order.id}>
              <div className={styles.dealHead}>
                <div>
                  <div className={styles.title}>Order {order.id}</div>
                  <div className={styles.inlineMeta}>
                    <span>Buyer: {order.buyerProfile?.displayName ?? order.buyerProfile?.user?.email ?? order.buyerProfileId}</span>
                    <span>Supplier: {order.supplierProfile?.displayName ?? order.supplierProfile?.user?.email ?? 'Unassigned'}</span>
                  </div>
                </div>
                <span className={`${styles.status} ${order.status === 'delivered' ? styles.statusSuccess : styles.statusWarning}`}>
                  {order.status}
                </span>
              </div>

              <div className={styles.inlineMeta}>
                <span>Payment: {order.paymentStatus}</span>
                <span>Transaction: {order.paymentTransactionId ?? 'n/a'}</span>
                <span>Total: {money(order.totalAmountMinor, order.currency)}</span>
              </div>
              {order.paymentRecords?.[0] ? (
                <div className={styles.subtle}>
                  Latest payment: {paymentMethodLabel(order.paymentRecords[0].method)} via {paymentProviderLabel(order.paymentRecords[0].provider)} ·{' '}
                  {order.paymentRecords[0].status} · Ref {order.paymentRecords[0].paymentReference ?? 'n/a'}
                </div>
              ) : null}

              <div className={styles.subtle}>Shipping: {addressLabel(order.shippingAddress)}</div>

              <div className={styles.stack}>
                <div className={styles.inlineMeta}>
                  <span className={`${styles.status} ${order.status === 'created' ? styles.statusWarning : ''}`}>Cart</span>
                  <span className={`${styles.status} ${order.status === 'pending' ? styles.statusWarning : ''}`}>Pending</span>
                  <span className={`${styles.status} ${order.status === 'paid' ? styles.statusSuccess : ''}`}>Paid</span>
                  <span className={`${styles.status} ${order.status === 'shipped' ? styles.statusWarning : ''}`}>Shipped</span>
                  <span className={`${styles.status} ${order.status === 'delivered' ? styles.statusSuccess : ''}`}>Delivered</span>
                </div>
                <div className={styles.subtle}>
                  {order.items.length} item(s)
                </div>
                <div className={styles.buttonRow}>
                  <Link href={`/orders/${order.id}`} className={styles.buttonSecondary}>
                    Open Detail
                  </Link>
                  <Link href={`/orders/${order.id}/payment`} className={styles.buttonSecondary}>
                    Payment Page
                  </Link>
                  {action}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function RetailOrderDetailBoard({
  orderId,
  viewerRole
}: {
  orderId: string;
  viewerRole: MarketplaceRole;
}) {
  const [state, setState] = useState<LoadState<{ order: RetailOrder | null; history: HistoryEvent[] }>>(loadingState({ order: null, history: [] }));

  if (viewerRole === 'guest') {
    return (
      <div className={styles.sectionCard}>
        <div className={styles.sectionTitle}>Sign in to view this order.</div>
        <div className={styles.subtle}>Order details and history are limited to the authenticated buyer, supplier, or admin session.</div>
        <div className={styles.buttonRow} style={{ marginTop: 12 }}>
          <Link href={`/signin?returnTo=/orders/${orderId}`} className={styles.button}>
            Sign In
          </Link>
          <Link href="/orders" className={styles.buttonSecondary}>
            Orders
          </Link>
        </div>
      </div>
    );
  }

  async function loadDetail() {
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const data = await retailJson<{ order: RetailOrder; history: HistoryEvent[] }>(`orders/${orderId}/history`);
      setState({ loading: false, data, error: null });
    } catch (requestError) {
      if (isAuthRedirectError(requestError)) {
        return;
      }

      setState({
        loading: false,
        data: { order: null, history: [] },
        error: requestError instanceof Error ? requestError.message : 'Unable to load order detail.'
      });
    }
  }

  useEffect(() => {
    void loadDetail();
  }, [orderId]);

  async function transition(action: 'pay' | 'ship' | 'confirm') {
    try {
      const init: RequestInit = { method: 'POST' };
      if (action === 'pay') {
        init.body = JSON.stringify({});
      }

      await retailJson<RetailOrder>(`orders/${orderId}/${action}`, init);
      await loadDetail();
    } catch (requestError) {
      if (isAuthRedirectError(requestError)) {
        return;
      }

      setState((current) => ({
        ...current,
        error: requestError instanceof Error ? requestError.message : `Unable to ${action} order.`
      }));
    }
  }

  if (state.error) {
    return <div className={styles.errorBox}>{state.error}</div>;
  }

  const order = state.data.order;
  const canBuy = viewerRole === 'buyer' || viewerRole === 'admin';
  const canShip = viewerRole === 'supplier' || viewerRole === 'admin';

  return (
    <div className={styles.grid}>
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>Order Detail</div>
            <div className={styles.muted}>Timeline is built from append-only audit events.</div>
          </div>
          <button type="button" className={styles.buttonSecondary} onClick={() => void loadDetail()} disabled={state.loading}>
            {state.loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {!order ? <div className={styles.emptyState}>Order not found.</div> : null}

        {order ? (
          <div className={styles.stack}>
            <div className={styles.inlineMeta}>
              <span>Status: {order.status}</span>
              <span>Payment: {order.paymentStatus}</span>
              <span>Transaction: {order.paymentTransactionId ?? 'n/a'}</span>
              <span>Total: {money(order.totalAmountMinor, order.currency)}</span>
            </div>
            {order.paymentRecords?.[0] ? (
              <div className={styles.stack}>
                <div className={styles.inlineMeta}>
                  <span>Method: {paymentMethodLabel(order.paymentRecords[0].method)}</span>
                  <span>Provider: {paymentProviderLabel(order.paymentRecords[0].provider)}</span>
                  <span>Status: {order.paymentRecords[0].status}</span>
                </div>
                <div className={styles.inlineMeta}>
                  <span>Reference: {order.paymentRecords[0].paymentReference ?? 'n/a'}</span>
                  <span>Transaction: {order.paymentRecords[0].transactionId ?? 'n/a'}</span>
                  <span>Bank ref: {order.paymentRecords[0].bankReference ?? 'n/a'}</span>
                </div>
                {paymentInstructionEntries(order.paymentRecords[0]).length ? (
                  <div className={styles.sectionCard} style={{ padding: 12, background: '#fff' }}>
                    <div className={styles.subtle}>Payment instructions</div>
                    <div className={styles.list}>
                      {paymentInstructionEntries(order.paymentRecords[0]).map(([key, value]) => (
                        <div className={styles.inlineMeta} key={key}>
                          <span>{key}</span>
                          <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className={styles.inlineMeta}>
              <span>Buyer: {order.buyerProfile?.displayName ?? order.buyerProfile?.user?.email ?? order.buyerProfileId}</span>
              <span>Supplier: {order.supplierProfile?.displayName ?? order.supplierProfile?.user?.email ?? 'Unassigned'}</span>
            </div>
            <div className={styles.subtle}>Shipping address: {addressLabel(order.shippingAddress)}</div>
              <div className={styles.buttonRow}>
                {order.status === 'pending' && canBuy ? (
                  <button type="button" className={styles.button} onClick={() => void transition('pay')}>
                    Pay
                  </button>
                ) : null}
              {order.status === 'paid' && canShip ? (
                <button type="button" className={styles.buttonSecondary} onClick={() => void transition('ship')}>
                  Mark Shipped
                </button>
              ) : null}
                {order.status === 'shipped' && canBuy ? (
                  <button type="button" className={styles.button} onClick={() => void transition('confirm')}>
                    Confirm Delivery
                  </button>
                ) : null}
                <Link href={`/orders/${order.id}/payment`} className={styles.buttonSecondary}>
                  Open Payment Page
                </Link>
                <Link href="/orders" className={styles.buttonSecondary}>
                  Back to Orders
                </Link>
              </div>
            </div>
        ) : null}
      </div>

      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>History</div>
            <div className={styles.muted}>Who did what and when.</div>
          </div>
        </div>

        {!state.data.history.length ? <div className={styles.emptyState}>No history events yet.</div> : null}

        <div className={styles.list}>
          {state.data.history.map((event) => (
            <article className={styles.quoteCard} key={event.id}>
              <div className={styles.rfqHead}>
                <div>
                  <div className={styles.title}>{event.eventType}</div>
                  <div className={styles.inlineMeta}>
                    <span>Actor: {event.actorId ?? 'system'}</span>
                    <span>When: {event.createdAt}</span>
                  </div>
                </div>
                <span className={styles.status}>{event.module}</span>
              </div>
              <div className={styles.subtle}>{JSON.stringify(event.payload)}</div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
