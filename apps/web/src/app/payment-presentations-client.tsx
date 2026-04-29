'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './payment-presentations.module.css';

type AuthRedirectError = Error & {
  name: 'AuthRedirectError';
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
  status: 'created' | 'pending' | 'paid' | 'shipped' | 'delivered' | 'fulfilled' | 'cancelled';
  paymentStatus: 'pending' | 'awaiting_transfer' | 'awaiting_confirmation' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  paymentTransactionId: string | null;
  shippingAddress?: Record<string, string> | null;
  currency: string;
  totalAmountMinor: number;
  buyerProfile?: { displayName?: string | null; user?: { email?: string | null } | null } | null;
  supplierProfile?: { displayName?: string | null; user?: { email?: string | null } | null } | null;
  paymentRecords?: RetailPaymentRecord[];
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

type PlatformProviderConnection = {
  key: string;
  providerName?: string;
  providerType?: string;
  enabled?: boolean;
  mode?: string;
  publicKey?: string | null;
  secretKey?: string | null;
  webhookSecret?: string | null;
  merchantId?: string | null;
  terminalId?: string | null;
  accountId?: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  apiBaseUrl?: string | null;
  callbackUrl?: string | null;
  returnUrl?: string | null;
  statusEndpoint?: string | null;
  notes?: string | null;
  status?: string;
  isReady?: boolean;
};

type PlatformPaymentConfig = {
  providers: PlatformProviderConnection[];
  bank: {
    beneficiaryName?: string;
    legalEntityName?: string;
    bankName?: string;
    bankAddress?: string;
    accountNumber?: string;
    iban?: string;
    swiftBic?: string;
    routingNumber?: string;
    branchCode?: string;
    intermediaryBank?: string;
    paymentReferencePrefix?: string;
    invoicePrefix?: string;
    supportEmail?: string;
    supportPhone?: string;
  };
  platform: {
    platformLegalName?: string;
    platformAddress?: string;
    platformRegistrationNumber?: string;
    taxVatNumber?: string;
    invoicingEmail?: string;
    defaultCurrency?: string;
    invoiceFooter?: string;
    paymentInstructionsText?: string;
    complianceDisclaimerText?: string;
  };
  compliance: {
    legalDisclaimer?: string;
    termsSnippet?: string;
    refundPaymentNote?: string;
    complianceStatement?: string;
    signatureNameTitle?: string;
    signatureImageUrl?: string;
    companySealImageUrl?: string;
  };
  manualPayment: {
    enabled?: boolean;
    paymentProofRequired?: boolean;
    instructionsText?: string;
    whoConfirmsPayments?: string;
    proofRequiredFields?: string[];
    reviewQueueLabel?: string;
    bankTransferInstructions?: string;
  };
  email: {
    enabled?: boolean;
    provider?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    fromName?: string;
    fromEmail?: string;
    replyToEmail?: string;
    supportEmail?: string;
    supportPhone?: string;
    notes?: string;
  };
  routing: Record<'card' | 'qr' | 'bank_transfer' | 'swift' | 'iban_invoice' | 'manual', string>;
  readiness: Record<'card' | 'qr' | 'bank_transfer' | 'swift' | 'iban_invoice' | 'manual', boolean>;
  fallback: {
    card: boolean;
    bankTransfer: boolean;
    manual: boolean;
  };
};

type InvoiceContext = {
  kind: 'deal' | 'order';
  id: string;
  invoiceNumber: string;
  dueDate: string;
  amountMinor: number;
  currency: string;
  status: string;
  paymentMethod: string;
  paymentProvider: string;
  transactionId?: string | null;
  paymentReference?: string | null;
  bankReference?: string | null;
  buyer: {
    name: string;
    email?: string | null;
    companyName?: string | null;
    tenantName?: string | null;
  };
  supplier: {
    name: string;
    email?: string | null;
    companyName?: string | null;
    tenantName?: string | null;
  };
  order: {
    id: string;
    status: string;
    paymentStatus: string;
    shippingAddress?: Record<string, unknown> | null;
    createdAt: string;
  } | null;
  deal: {
    id: string;
    status: string;
    buyerStatus: string;
    supplierStatus: string;
    rfqId: string;
    quoteId: string;
    createdAt: string;
  } | null;
  payment: ContractDealPaymentRecord | RetailPaymentRecord | null;
  paymentInstructions: Array<{ label: string; value: string }>;
  timeline: Array<{
    id: string;
    module: string;
    eventType: string;
    title: string;
    body: string;
    actorId?: string | null;
    subjectType?: string | null;
    subjectId?: string | null;
    createdAt: string;
  }>;
  platform: {
    legalName: string;
    address: string;
    registrationNumber: string;
    taxVatNumber: string;
    invoicingEmail: string;
    defaultCurrency: string;
    invoiceFooter: string;
    paymentInstructionsText: string;
    complianceDisclaimerText: string;
  };
  bank: PlatformPaymentConfig['bank'];
  compliance: PlatformPaymentConfig['compliance'];
  signature: {
    nameTitle: string;
    imageUrl?: string;
    companySealImageUrl?: string;
  };
  pdfUrl: string;
};

function money(value: number, currency: string) {
  return `${currency} ${(value / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
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

function paymentMethodLabel(method: RetailPaymentRecord['method']) {
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
      return 'Payment';
  }
}

function paymentProviderLabel(provider: RetailPaymentRecord['provider']) {
  switch (provider) {
    case 'airwallex':
      return 'Airwallex';
    case 'internal_manual':
      return 'Internal manual';
    case 'none':
      return 'None';
    default:
      return 'Provider';
  }
}

function instructionEntries(
  record?: { instructions?: RetailPaymentRecord['instructions'] | ContractDealPaymentRecord['instructions'] } | null
) {
  if (!record?.instructions || typeof record.instructions !== 'object' || Array.isArray(record.instructions)) {
    return [];
  }

  return Object.entries(record.instructions as Record<string, unknown>)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([label, value]) => ({
      label,
      value: String(value)
    }));
}

function invoiceNumber(id: string) {
  return `INV-${id.slice(0, 8).toUpperCase()}`;
}

async function platformJson<T>(path: string, init?: RequestInit) {
  const hasBody = init?.body !== undefined && init?.body !== null;
  const response = await fetch(`/api/platform/${path}`, {
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

export function RetailOrderPaymentBoard({ orderId }: { orderId: string }) {
  const [state, setState] = useState<LoadState<RetailOrder | null>>({
    loading: true,
    data: null,
    error: null
  });
  const [configState, setConfigState] = useState<LoadState<PlatformPaymentConfig | null>>({
    loading: true,
    data: null,
    error: null
  });
  const [method, setMethod] = useState<RetailPaymentRecord['method']>('card');
  const [card, setCard] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
    cardholderName: ''
  });
  const [loadingAction, setLoadingAction] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);

  async function loadOrder() {
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const order = await retailJson<RetailOrder>(`orders/${orderId}`);
      setState({ loading: false, data: order, error: null });
      setMethod(order.paymentRecords?.[0]?.method ?? 'card');
    } catch (error) {
      if (isAuthRedirectError(error)) {
        return;
      }

      setState({
        loading: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unable to load payment page.'
      });
    }
  }

  async function loadPaymentConfig() {
    setConfigState((current) => ({ ...current, loading: true, error: null }));

    try {
      const config = await platformJson<PlatformPaymentConfig>('payment-config');
      setConfigState({ loading: false, data: config, error: null });
    } catch (error) {
      if (isAuthRedirectError(error)) {
        return;
      }

      setConfigState({
        loading: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unable to load payment settings.'
      });
    }
  }

  useEffect(() => {
    void loadOrder();
    void loadPaymentConfig();
  }, [orderId]);

  async function submit() {
    setLoadingAction(true);
    setSuccess(null);
    setCardError(null);

    try {
      const paymentProviderForMethod = method === 'card' || method === 'qr' ? 'airwallex' : 'internal_manual';

      if (method === 'card') {
        const cleanedCardNumber = card.cardNumber.replace(/\s+/g, '');

        if (!cleanedCardNumber || cleanedCardNumber.length < 12) {
          throw new Error('Enter a valid card number.');
        }

        if (!card.expiry.trim()) {
          throw new Error('Enter a card expiry date.');
        }

        if (!card.cvv.trim()) {
          throw new Error('Enter the CVV.');
        }

        if (!card.cardholderName.trim()) {
          throw new Error('Enter the cardholder name.');
        }
      }

      const [rawExpiryMonth, rawExpiryYear] = card.expiry.split('/').map((value) => value.trim());
      const normalizedExpiryMonth = rawExpiryMonth ? rawExpiryMonth.padStart(2, '0') : '';
      const normalizedExpiryYear = rawExpiryYear
        ? (rawExpiryYear.length === 2 ? `20${rawExpiryYear}` : rawExpiryYear)
        : '';

      await retailJson<RetailOrder>(`orders/${orderId}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          method,
          paymentProvider: paymentProviderForMethod,
          note: `Payment submitted from UI via ${method}.`,
          ...(method === 'card'
            ? {
                card: {
                  cardholderName: card.cardholderName.trim(),
                  cardNumber: card.cardNumber.replace(/\s+/g, ''),
                  expiryMonth: normalizedExpiryMonth,
                  expiryYear: normalizedExpiryYear,
                  cvc: card.cvv.trim()
                }
              }
            : {})
        })
      });
      setSuccess('Payment submitted. Awaiting confirmation.');
      await loadOrder();
    } catch (error) {
      if (isAuthRedirectError(error)) {
        return;
      }

      const message = error instanceof Error ? error.message : 'Unable to submit payment.';
      if (method === 'card') {
        setCardError(message);
      } else {
        setState((current) => ({
          ...current,
          error: message
        }));
      }
    } finally {
      setLoadingAction(false);
    }
  }

  const order = state.data;
  const payment = order?.paymentRecords?.[0] ?? null;
  const instructionRows = instructionEntries(payment);
  const config = configState.data;
  const bank = config?.bank ?? null;
  const selectedProviderKey = config?.routing?.[method] ?? 'internal_manual';
  const selectedProvider =
    config?.providers.find((provider) => provider.providerType === selectedProviderKey || provider.key === selectedProviderKey) ?? null;
  const providerFallback = Boolean(config && !config.readiness[method]);

  if (state.loading && !order) {
    return <div className={styles.notice}>Loading payment page...</div>;
  }

  return (
    <div className={styles.shell}>
      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <div className={styles.eyebrow}>B2C Order Payment</div>
            <h2 className={styles.heading}>Choose a payment method and complete checkout.</h2>
            <p className={styles.copy}>
              This form records a payment submission and keeps the payment record visible in the order until confirmation arrives.
            </p>
          </div>
          <div className={styles.buttonRow}>
            <Link href={`/orders/${orderId}`} className={styles.secondaryButton}>
              Back to Order
            </Link>
            <Link href="/orders" className={styles.primaryButton}>
              Orders
            </Link>
          </div>
        </div>

        {state.error ? <div className={styles.errorBox}>{state.error}</div> : null}
        {configState.error ? <div className={styles.notice}>Payment settings: {configState.error}</div> : null}
        {success ? <div className={styles.successBox}>{success}</div> : null}

        {order ? (
          <div className={styles.grid}>
            <section className={styles.card}>
              <div className={styles.row}>
                <span className={styles.label}>Order</span>
                <span>{order.id}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.label}>Status</span>
                <span>{order.status}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.label}>Payment status</span>
                <span>{order.paymentStatus}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.label}>Amount</span>
                <span>{money(order.totalAmountMinor, order.currency)}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.label}>Transaction</span>
                <span>{order.paymentTransactionId ?? 'n/a'}</span>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.sectionTitle}>Payment method</div>
              <div className={styles.buttonRow}>
                {(['card', 'qr', 'bank_transfer', 'swift', 'manual'] as const).map((entry) => (
                  <button
                    type="button"
                    key={entry}
                    className={method === entry ? styles.primaryButton : styles.secondaryButton}
                    onClick={() => setMethod(entry)}
                  >
                    {paymentMethodLabel(entry)}
                  </button>
                ))}
              </div>
              <p className={styles.helper}>
                {method === 'card'
                  ? providerFallback
                    ? 'No live card provider credentials are active. This form still records a controlled card payment attempt.'
                    : 'Enter card details below and submit to create the payment attempt.'
                  : method === 'qr'
                    ? 'QR payment will show a reference and scan-ready instructions.'
                  : method === 'bank_transfer'
                    ? 'Bank transfer will show transfer instructions and reference.'
                    : method === 'swift'
                      ? 'SWIFT payment will show beneficiary, IBAN, SWIFT/BIC, and transfer reference.'
                    : 'Manual payment stays in review until it is confirmed.'}
              </p>
              <div className={styles.metaRow}>
                <span>Route provider: {selectedProvider?.providerName ?? selectedProviderKey}</span>
                <span>Provider status: {selectedProvider?.status ?? (providerFallback ? 'fallback' : 'loading')}</span>
                <span>Ready: {selectedProvider?.isReady ? 'yes' : 'no'}</span>
              </div>
            </section>

            {method === 'card' ? (
              <section className={styles.card}>
                <div className={styles.sectionTitle}>Card payment form</div>
                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    <span>Card number</span>
                    <input value={card.cardNumber} onChange={(event) => setCard((current) => ({ ...current, cardNumber: event.target.value }))} placeholder="4242 4242 4242 4242" />
                  </label>
                  <label className={styles.field}>
                    <span>Expiry date</span>
                    <input value={card.expiry} onChange={(event) => setCard((current) => ({ ...current, expiry: event.target.value }))} placeholder="MM/YY" />
                  </label>
                  <label className={styles.field}>
                    <span>CVV</span>
                    <input value={card.cvv} onChange={(event) => setCard((current) => ({ ...current, cvv: event.target.value }))} placeholder="123" />
                  </label>
                  <label className={styles.field}>
                    <span>Cardholder name</span>
                    <input value={card.cardholderName} onChange={(event) => setCard((current) => ({ ...current, cardholderName: event.target.value }))} placeholder="Jane Buyer" />
                  </label>
                </div>
                {cardError ? <div className={styles.errorBox}>{cardError}</div> : null}
                <div className={styles.buttonRow}>
                  <button type="button" className={styles.primaryButton} onClick={() => void submit()} disabled={loadingAction}>
                    {loadingAction ? 'Submitting...' : 'Submit Payment'}
                  </button>
                </div>
              </section>
            ) : null}

            {method !== 'card' ? (
              <section className={styles.card}>
                <div className={styles.sectionTitle}>Payment instructions</div>
                {config ? (
                  <>
                    {(method === 'bank_transfer' || method === 'swift' || method === 'iban_invoice') ? (
                      <div className={styles.stack}>
                        <div className={styles.metaRow}>
                          <span>Beneficiary: {bank?.beneficiaryName ?? 'n/a'}</span>
                          <span>Bank: {bank?.bankName ?? 'n/a'}</span>
                          <span>Support: {bank?.supportEmail ?? config.platform.invoicingEmail ?? 'n/a'}</span>
                        </div>
                        <div className={styles.instructionList}>
                          {[
                            ['Beneficiary', bank?.beneficiaryName ?? config.platform.platformLegalName ?? 'n/a'],
                            ['Legal entity', bank?.legalEntityName ?? config.platform.platformLegalName ?? 'n/a'],
                            ['IBAN', bank?.iban ?? 'n/a'],
                            ['SWIFT/BIC', bank?.swiftBic ?? 'n/a'],
                            ['Account number', bank?.accountNumber ?? 'n/a'],
                            ['Reference prefix', bank?.paymentReferencePrefix ?? 'n/a'],
                            [
                              'Instructions',
                              config.manualPayment.bankTransferInstructions ?? config.platform.paymentInstructionsText ?? 'Use the invoice reference exactly as shown.'
                            ]
                          ].map(([key, value]) => (
                            <div key={key} className={styles.instructionRow}>
                              <span>{key}</span>
                              <span>{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {method === 'manual' ? (
                      <div className={styles.helper}>
                        {config.manualPayment.instructionsText ?? 'Manual payment waits for review confirmation.'}
                      </div>
                    ) : null}

                    {method === 'qr' ? (
                      <div className={styles.instructionList}>
                        <div className={styles.instructionRow}>
                          <span>QR provider</span>
                          <span>{selectedProvider?.providerName ?? 'Airwallex-ready placeholder'}</span>
                        </div>
                        <div className={styles.instructionRow}>
                          <span>Payment reference</span>
                          <span>{payment?.paymentReference ?? 'Generated after checkout'}</span>
                        </div>
                        <div className={styles.helper}>
                          Scan-ready QR placeholder and hosted payment-link flow are controlled by current provider settings.
                        </div>
                      </div>
                    ) : null}

                    {payment ? (
                      <>
                        <div className={styles.metaRow}>
                          <span>Method: {paymentMethodLabel(payment.method)}</span>
                          <span>Provider: {paymentProviderLabel(payment.provider)}</span>
                          <span>Status: {payment.status}</span>
                        </div>
                        <div className={styles.metaRow}>
                          <span>Reference: {payment.paymentReference ?? 'n/a'}</span>
                          <span>Bank ref: {payment.bankReference ?? 'n/a'}</span>
                          <span>Transaction: {payment.transactionId ?? 'n/a'}</span>
                        </div>
                        <div className={styles.instructionList}>
                          {instructionRows.length ? instructionRows.map((entry) => (
                            <div key={entry.label} className={styles.instructionRow}>
                              <span>{entry.label}</span>
                              <span>{entry.value}</span>
                            </div>
                          )) : <div className={styles.helper}>No instructions available yet. Select the payment rail on checkout first.</div>}
                        </div>
                        <div className={styles.helper}>
                          {method === 'bank_transfer'
                            ? 'Bank transfer stays in review until reconciliation marks it paid.'
                            : method === 'manual'
                              ? 'Manual payments wait for review confirmation.'
                              : 'QR payment shows the instruction payload for scan-and-reconcile flow.'}
                        </div>
                      </>
                    ) : (
                      <div className={styles.helper}>No payment record yet. Finish checkout first.</div>
                    )}
                  </>
                ) : (
                  <div className={styles.helper}>Loading payment settings...</div>
                )}
              </section>
            ) : null}

            <section className={styles.card}>
              <div className={styles.sectionTitle}>Current payment record</div>
              {payment ? (
                <div className={styles.stack}>
                  <div className={styles.metaRow}>
                    <span>{paymentMethodLabel(payment.method)}</span>
                    <span>{paymentProviderLabel(payment.provider)}</span>
                    <span>{payment.status}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span>Reference: {payment.paymentReference ?? 'n/a'}</span>
                    <span>Transaction: {payment.transactionId ?? 'n/a'}</span>
                  </div>
                </div>
              ) : (
                <div className={styles.helper}>No payment record exists yet.</div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function InvoiceView({ dealId }: { dealId: string }) {
  const [state, setState] = useState<LoadState<InvoiceContext | null>>({
    loading: true,
    data: null,
    error: null
  });

  async function loadInvoice() {
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const context = await platformJson<InvoiceContext>(`invoice-context/deal/${dealId}`);
      setState({ loading: false, data: context, error: null });
    } catch (error) {
      if (isAuthRedirectError(error)) {
        return;
      }

      setState({
        loading: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unable to load invoice.'
      });
    }
  }

  useEffect(() => {
    void loadInvoice();
    const interval = setInterval(() => {
      void loadInvoice();
    }, 20_000);

    return () => clearInterval(interval);
  }, [dealId]);

  const invoiceId = state.data?.invoiceNumber ?? invoiceNumber(dealId);
  const context = state.data;
  const payment = context?.payment ?? null;
  const rows = context?.paymentInstructions ?? instructionEntries(payment);

  function printInvoice() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  return (
    <div className={styles.invoiceShell}>
      <div className={styles.invoiceToolbar}>
        <Link href="/deals" className={styles.secondaryButton}>
          Back to Deals
        </Link>
        <div className={styles.buttonRow}>
          <Link href={context?.pdfUrl ?? `/invoice/${dealId}/pdf`} className={styles.primaryButton}>
            Download PDF
          </Link>
          <button type="button" className={styles.secondaryButton} onClick={printInvoice}>
            Print invoice
          </button>
        </div>
      </div>

      {state.error ? <div className={styles.errorBox}>{state.error}</div> : null}

      <section className={styles.invoicePaper}>
        <div className={styles.invoiceHeader}>
          <div>
            <div className={styles.eyebrow}>B2B Invoice</div>
            <h1 className={styles.invoiceTitle}>{invoiceId}</h1>
            <p className={styles.copy}>
              {context?.platform.paymentInstructionsText ?? 'Printable invoice and transfer instructions for the accepted deal.'}
            </p>
          </div>
          <div className={styles.invoiceStatus}>{context?.status ?? 'pending'}</div>
        </div>

        <div className={styles.invoiceMetaGrid}>
          <div className={styles.card}>
            <div className={styles.sectionTitle}>Parties</div>
            <div className={styles.row}>
              <span className={styles.label}>Buyer</span>
              <span>{context?.buyer.name ?? 'n/a'}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Supplier</span>
              <span>{context?.supplier.name ?? 'n/a'}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Deal</span>
              <span>{context?.deal?.id ?? context?.order?.id ?? dealId}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Due date</span>
              <span>{context?.dueDate ? new Date(context.dueDate).toLocaleDateString() : 'n/a'}</span>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.sectionTitle}>Payment summary</div>
            <div className={styles.row}>
              <span className={styles.label}>Invoice number</span>
              <span>{invoiceId}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Method</span>
              <span>{context ? paymentMethodLabel(payment?.method as RetailPaymentRecord['method']) : 'n/a'}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Provider</span>
              <span>{context ? paymentProviderLabel(payment?.provider as RetailPaymentRecord['provider']) : 'n/a'}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Status</span>
              <span>{context?.status ?? 'pending'}</span>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.sectionTitle}>Amount</div>
            <div className={styles.amountRow}>{context ? money(context.amountMinor, context.currency) : 'n/a'}</div>
            <div className={styles.helper}>
              {context?.platform.complianceDisclaimerText ?? 'Quote and instructions are tied to the accepted deal.'}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.sectionTitle}>Issuer</div>
            <div className={styles.row}><span className={styles.label}>Legal name</span><span>{context?.platform.legalName ?? 'n/a'}</span></div>
            <div className={styles.row}><span className={styles.label}>Address</span><span>{context?.platform.address ?? 'n/a'}</span></div>
            <div className={styles.row}><span className={styles.label}>Registration</span><span>{context?.platform.registrationNumber ?? 'n/a'}</span></div>
            <div className={styles.row}><span className={styles.label}>Tax / VAT</span><span>{context?.platform.taxVatNumber ?? 'n/a'}</span></div>
            <div className={styles.helper}>{context?.platform.invoiceFooter ?? 'Invoice footer not configured.'}</div>
          </div>
        </div>

        <div className={styles.invoiceSection}>
          <div className={styles.sectionTitle}>Payment instructions</div>
          {context ? (
            <div className={styles.stack}>
              <div className={styles.metaRow}>
                <span>Reference: {context.paymentReference ?? 'n/a'}</span>
                <span>Transaction: {context.transactionId ?? 'n/a'}</span>
                <span>Bank ref: {context.bankReference ?? 'n/a'}</span>
              </div>
              <div className={styles.instructionList}>
                {rows.length ? (
                  rows.map((entry) => (
                    <div key={entry.label} className={styles.instructionRow}>
                      <span>{entry.label}</span>
                      <span>{entry.value}</span>
                    </div>
                  ))
                ) : (
                  <div className={styles.helper}>No instruction payload available.</div>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.helper}>No payment record exists yet for this deal.</div>
          )}
        </div>

        <div className={styles.invoiceSection}>
          <div className={styles.sectionTitle}>Footer and compliance</div>
          <div className={styles.helper}>{context?.platform.invoiceFooter ?? 'No invoice footer configured.'}</div>
          <div className={styles.helper}>{context?.platform.complianceDisclaimerText ?? 'No compliance disclaimer configured.'}</div>
          <div className={styles.helper}>{context?.compliance.legalDisclaimer ?? 'No legal disclaimer configured.'}</div>
        </div>

        <div className={styles.invoiceMetaGrid}>
          <div className={styles.card}>
            <div className={styles.sectionTitle}>Bank details</div>
            <div className={styles.row}><span className={styles.label}>Beneficiary</span><span>{context?.bank.beneficiaryName ?? 'n/a'}</span></div>
            <div className={styles.row}><span className={styles.label}>Bank</span><span>{context?.bank.bankName ?? 'n/a'}</span></div>
            <div className={styles.row}><span className={styles.label}>IBAN</span><span>{context?.bank.iban ?? 'n/a'}</span></div>
            <div className={styles.row}><span className={styles.label}>SWIFT/BIC</span><span>{context?.bank.swiftBic ?? 'n/a'}</span></div>
            <div className={styles.row}><span className={styles.label}>Account number</span><span>{context?.bank.accountNumber ?? 'n/a'}</span></div>
            <div className={styles.row}><span className={styles.label}>Support email</span><span>{context?.bank.supportEmail ?? context?.platform.invoicingEmail ?? 'n/a'}</span></div>
            <div className={styles.row}><span className={styles.label}>Support phone</span><span>{context?.bank.supportPhone ?? 'n/a'}</span></div>
          </div>

          <div className={styles.card}>
            <div className={styles.sectionTitle}>Compliance</div>
            <div className={styles.helper}>{context?.compliance.legalDisclaimer ?? 'No legal disclaimer configured.'}</div>
            <div className={styles.helper}>{context?.compliance.termsSnippet ?? 'No terms snippet configured.'}</div>
            <div className={styles.helper}>{context?.compliance.refundPaymentNote ?? 'No refund note configured.'}</div>
            <div className={styles.helper}>{context?.compliance.complianceStatement ?? 'No compliance statement configured.'}</div>
          </div>

          <div className={styles.card}>
            <div className={styles.sectionTitle}>Signature</div>
            <div className={styles.row}><span className={styles.label}>Issued by</span><span>{context?.platform.legalName ?? 'n/a'}</span></div>
            <div className={styles.row}><span className={styles.label}>Authorized by</span><span>{context?.signature.nameTitle ?? 'Authorized Signatory'}</span></div>
            <div className={styles.row}><span className={styles.label}>Support</span><span>{context?.platform.invoicingEmail ?? 'n/a'}</span></div>
            <div className={styles.helper}>
              {context?.signature.imageUrl ? `Signature image configured: ${context.signature.imageUrl}` : 'Signature placeholder enabled.'}
            </div>
          </div>
        </div>

        <div className={styles.invoiceSection}>
          <div className={styles.sectionTitle}>Documents</div>
          <div className={styles.instructionList}>
            <Link href={context?.pdfUrl ?? `/invoice/${dealId}/pdf`} className={styles.instructionRow}>
              <span>Invoice PDF</span>
              <span>Download or store the invoice document</span>
            </Link>
            {context?.kind === 'deal' ? (
              <Link href={`/deals/${dealId}/pdf`} className={styles.instructionRow}>
                <span>Deal summary PDF</span>
                <span>Commercial proforma with parties and terms</span>
              </Link>
            ) : null}
            {context?.kind === 'deal' ? (
              <Link href={`/deals/${dealId}/escrow-pdf`} className={styles.instructionRow}>
                <span>Escrow summary PDF</span>
                <span>Funds held and release status</span>
              </Link>
            ) : null}
          </div>
        </div>

        <div className={styles.invoiceSection}>
          <div className={styles.sectionTitle}>Timeline</div>
          {context?.timeline?.length ? (
            <div className={styles.instructionList}>
              {context.timeline.map((item) => (
                <div key={item.id} className={styles.instructionRow}>
                  <span>
                    {item.title}
                    <br />
                    <small>{new Date(item.createdAt).toLocaleString()}</small>
                  </span>
                  <span>{item.body}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.helper}>No timeline entries yet.</div>
          )}
        </div>

        {payment?.attempts?.length ? (
          <div className={styles.invoiceSection}>
            <div className={styles.sectionTitle}>Payment attempts</div>
            <div className={styles.instructionList}>
              {payment.attempts.map((attempt) => (
                <div className={styles.instructionRow} key={attempt.id}>
                  <span>{attempt.attemptType}</span>
                  <span>
                    {attempt.status} · {attempt.method} · {attempt.provider}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
