'use client';

import { useState } from 'react';

type Product = {
  id: string;
  name: string;
  slug: string;
  status: string;
  targetMarket: string;
  prices?: Array<{ amountMinor: number; currency: string }>;
  category?: { name?: string };
  sellerProfile?: { displayName?: string };
};

type Rfq = {
  id: string;
  productId: string | null;
  qty: number;
  createdAt: string;
  status: 'new' | 'accepted' | 'rejected';
};

type RequestState = {
  isLoading: boolean;
  success: string | null;
  error: string | null;
};

type RfqActionState = {
  isLoading: boolean;
  error: string | null;
};

const initialRequestState: RequestState = {
  isLoading: false,
  success: null,
  error: null
};

export function ProductList({
  initialRfqs,
  products
}: {
  initialRfqs: Rfq[];
  products: Product[];
}) {
  const [requestStateByProduct, setRequestStateByProduct] = useState<Record<string, RequestState>>({});
  const [rfqs, setRfqs] = useState<Rfq[]>(initialRfqs);
  const [rfqActionStateById, setRfqActionStateById] = useState<Record<string, RfqActionState>>({});

  async function requestQuote(product: Product) {
    setRequestStateByProduct((current) => ({
      ...current,
      [product.id]: {
        isLoading: true,
        success: null,
        error: null
      }
    }));

    try {
      const response = await fetch('/api/contract/rfq', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          productId: product.id,
          qty: 1
        })
      });

      const responseText = await response.text();
      let responseData: unknown = null;
      let createdRfq: Rfq | null = null;

      try {
        responseData = responseText ? JSON.parse(responseText) : null;
      } catch {
        responseData = responseText;
      }

      if (!response.ok) {
        const message =
          typeof responseData === 'object' &&
          responseData !== null &&
          'message' in responseData &&
          typeof responseData.message === 'string'
            ? responseData.message
            : `Request failed with status ${response.status}`;

        throw new Error(message);
      }

      if (
        typeof responseData === 'object' &&
        responseData !== null &&
        'data' in responseData &&
        typeof responseData.data === 'object' &&
        responseData.data !== null &&
        'id' in responseData.data &&
        'qty' in responseData.data &&
        'createdAt' in responseData.data
      ) {
        const data = responseData.data as Partial<Rfq>;
        createdRfq = {
          id: typeof data.id === 'string' ? data.id : crypto.randomUUID(),
          productId: typeof data.productId === 'string' ? data.productId : null,
          qty: typeof data.qty === 'number' ? data.qty : 1,
          createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
          status: data.status === 'accepted' || data.status === 'rejected' ? data.status : 'new'
        };
      }

      if (createdRfq) {
        setRfqs((current) => [createdRfq!, ...current]);
      }

      setRequestStateByProduct((current) => ({
        ...current,
        [product.id]: {
          isLoading: false,
          success: 'RFQ created.',
          error: null
        }
      }));
    } catch (error) {
      setRequestStateByProduct((current) => ({
        ...current,
        [product.id]: {
          isLoading: false,
          success: null,
          error: error instanceof Error ? error.message : 'Unable to create RFQ.'
        }
      }));
    }
  }

  async function updateRfqStatus(rfqId: string, nextStatus: 'accepted' | 'rejected') {
    setRfqActionStateById((current) => ({
      ...current,
      [rfqId]: {
        isLoading: true,
        error: null
      }
    }));

    try {
      const response = await fetch(`/api/contract/rfq/${rfqId}/${nextStatus === 'accepted' ? 'accept' : 'reject'}`, {
        method: 'POST'
      });
      const responseText = await response.text();
      let responseData: unknown = null;

      try {
        responseData = responseText ? JSON.parse(responseText) : null;
      } catch {
        responseData = responseText;
      }

      if (!response.ok) {
        const message =
          typeof responseData === 'object' &&
          responseData !== null &&
          'message' in responseData &&
          typeof responseData.message === 'string'
            ? responseData.message
            : `Request failed with status ${response.status}`;

        throw new Error(message);
      }

      if (
        typeof responseData === 'object' &&
        responseData !== null &&
        'id' in responseData &&
        typeof responseData.id === 'string' &&
        'status' in responseData &&
        (responseData.status === 'new' || responseData.status === 'accepted' || responseData.status === 'rejected')
      ) {
        setRfqs((current) =>
          current.map((rfq) => (rfq.id === responseData.id ? { ...rfq, status: responseData.status as Rfq['status'] } : rfq))
        );
      }

      setRfqActionStateById((current) => ({
        ...current,
        [rfqId]: {
          isLoading: false,
          error: null
        }
      }));
    } catch (error) {
      setRfqActionStateById((current) => ({
        ...current,
        [rfqId]: {
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unable to update RFQ.'
        }
      }));
    }
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 16 }}>
        {products.map((product) => {
          const requestState = requestStateByProduct[product.id] ?? initialRequestState;

          return (
            <li
              key={product.id}
              style={{
                border: '1px solid #d6d3d1',
                borderRadius: 12,
                padding: 16,
                background: '#fff'
              }}
            >
              <div style={{ display: 'grid', gap: 8 }}>
                <div>
                  <strong>{product.name}</strong> ({product.slug}) [{product.targetMarket}]
                </div>
                <div>
                  {product.category?.name ?? 'Uncategorized'} - {product.sellerProfile?.displayName ?? 'Unknown seller'} -{' '}
                  {product.prices?.[0]
                    ? `${product.prices[0].currency} ${(product.prices[0].amountMinor / 100).toFixed(2)}`
                    : 'No price'}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => void requestQuote(product)}
                    disabled={requestState.isLoading}
                    style={{
                      background: requestState.isLoading ? '#9ca3af' : '#1f2937',
                      color: '#fff',
                      border: 0,
                      borderRadius: 8,
                      padding: '10px 14px',
                      fontWeight: 600,
                      cursor: requestState.isLoading ? 'progress' : 'pointer'
                    }}
                  >
                    {requestState.isLoading ? 'Requesting...' : 'Request Quote'}
                  </button>
                </div>
                {requestState.success ? (
                  <div style={{ color: '#166534', fontSize: 14 }}>{requestState.success}</div>
                ) : null}
                {requestState.error ? (
                  <div style={{ color: '#b91c1c', fontSize: 14 }}>{requestState.error}</div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <section>
        <h2>My Requests</h2>
        {rfqs.length ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
            {rfqs.map((rfq) => {
              const actionState = rfqActionStateById[rfq.id] ?? { isLoading: false, error: null };
              const isClosed = rfq.status !== 'new';

              return (
                <li
                  key={rfq.id}
                  style={{
                    border: '1px solid #d6d3d1',
                    borderRadius: 12,
                    padding: 16,
                    background: '#fff'
                  }}
                >
                  <div>productId: {rfq.productId ?? 'unknown'}</div>
                  <div>qty: {rfq.qty}</div>
                  <div>createdAt: {rfq.createdAt}</div>
                  <div>status: {rfq.status}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={() => void updateRfqStatus(rfq.id, 'accepted')}
                      disabled={actionState.isLoading || isClosed}
                      style={{
                        background: actionState.isLoading || isClosed ? '#9ca3af' : '#166534',
                        color: '#fff',
                        border: 0,
                        borderRadius: 8,
                        padding: '8px 12px',
                        fontWeight: 600,
                        cursor: actionState.isLoading || isClosed ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => void updateRfqStatus(rfq.id, 'rejected')}
                      disabled={actionState.isLoading || isClosed}
                      style={{
                        background: actionState.isLoading || isClosed ? '#9ca3af' : '#b91c1c',
                        color: '#fff',
                        border: 0,
                        borderRadius: 8,
                        padding: '8px 12px',
                        fontWeight: 600,
                        cursor: actionState.isLoading || isClosed ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Reject
                    </button>
                  </div>
                  {actionState.error ? <div style={{ color: '#b91c1c', fontSize: 14, marginTop: 8 }}>{actionState.error}</div> : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p>No requests yet.</p>
        )}
      </section>
    </div>
  );
}
