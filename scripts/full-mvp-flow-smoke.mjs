const api = process.env.RUFLO_BASE_URL ?? 'http://api:3000';
const keycloak = process.env.RUFLO_KEYCLOAK_URL ?? 'http://keycloak:8080';

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { status: response.status, ok: response.ok, data, text };
}

async function getToken(username, password, clientId = 'ruflo-web-ui', clientSecret = 'change-me-web-client') {
  const response = await request(`${keycloak}/realms/ruflo/protocol/openid-connect/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: clientId,
      client_secret: clientSecret,
      username,
      password
    })
  });

  if (!response.ok || !response.data?.access_token) {
    throw new Error(`Unable to get token for ${username}: ${response.status} ${response.text}`);
  }

  return response.data;
}

async function getAdminToken() {
  return getToken('admin@ruflo.local', 'change-me-admin', 'ruflo-admin-ui', 'change-me-admin-client');
}

function withAuth(token) {
  return (path, options = {}) =>
    request(`${api}${path}`, {
      ...options,
      headers: {
        authorization: `Bearer ${token}`,
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(options.headers ?? {})
      }
    });
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function ensureStatus(response, expected, label) {
  const allowed = Array.isArray(expected) ? expected : [expected];
  ensure(allowed.includes(response.status), `${label} expected ${allowed.join('/')} but got ${response.status}: ${response.text}`);
}

async function main() {
  const buyer = await getToken('buyer@ruflo.local', 'change-me-buyer');
  const supplier = await getToken('supplier@ruflo.local', 'change-me-supplier');
  const admin = await getAdminToken();
  const asBuyer = withAuth(buyer.access_token);
  const asSupplier = withAuth(supplier.access_token);
  const asAdmin = withAuth(admin.access_token);

  const health = await request(`${api}/api/health`);
  ensureStatus(health, 200, 'api health');

  const productsRes = await request(`${api}/api/catalog/public/products`);
  ensureStatus(productsRes, 200, 'public products');
  const product = Array.isArray(productsRes.data) ? productsRes.data.find((item) => item.sellerProfile?.userId) : null;
  ensure(product?.id, 'No product with a linked supplier was found.');

  const buyerRfqsBefore = await asBuyer('/api/contract/rfq');
  ensureStatus(buyerRfqsBefore, 200, 'buyer RFQ list');
  const buyerCountBefore = Array.isArray(buyerRfqsBefore.data) ? buyerRfqsBefore.data.length : 0;

  const createRfq = await asBuyer('/api/contract/rfq', {
    method: 'POST',
    body: JSON.stringify({
      productId: product.id,
      qty: 2
    })
  });
  ensureStatus(createRfq, [200, 201], 'create RFQ');
  const rfq = createRfq.data?.data ?? createRfq.data;
  ensure(rfq?.id, 'RFQ id missing.');

  const buyerRfqsAfter = await asBuyer('/api/contract/rfq');
  ensureStatus(buyerRfqsAfter, 200, 'buyer RFQ refresh');
  ensure(
    Array.isArray(buyerRfqsAfter.data) && buyerRfqsAfter.data.some((item) => item.id === rfq.id),
    'Buyer RFQ board did not include the created RFQ.'
  );
  ensure((Array.isArray(buyerRfqsAfter.data) ? buyerRfqsAfter.data.length : 0) >= buyerCountBefore + 1, 'Buyer RFQ count did not increase.');

  const supplierInbox = await asSupplier('/api/contract/rfq/supplier-inbox');
  ensureStatus(supplierInbox, 200, 'supplier inbox');
  ensure(Array.isArray(supplierInbox.data) && supplierInbox.data.some((item) => item.id === rfq.id), 'Supplier inbox did not include the RFQ.');

  const submitQuote = await asSupplier(`/api/contract/rfq/${rfq.id}/quotes`, {
    method: 'POST',
    body: JSON.stringify({
      unitPrice: 1234,
      totalPrice: 2468,
      currency: 'USD',
      note: 'MVP flow smoke quote'
    })
  });
  ensureStatus(submitQuote, [200, 201], 'submit quote');
  const quote = submitQuote.data?.data ?? submitQuote.data;
  ensure(quote?.id, 'Quote id missing.');

  const buyerQuotes = await asBuyer('/api/contract/quotes');
  ensureStatus(buyerQuotes, 200, 'buyer quote list');
  ensure(Array.isArray(buyerQuotes.data) && buyerQuotes.data.some((item) => item.id === quote.id), 'Buyer quote list did not include the submitted quote.');

  const acceptQuote = await asBuyer(`/api/contract/quotes/${quote.id}/accept`, {
    method: 'POST'
  });
  ensureStatus(acceptQuote, [200, 201], 'accept quote');

  const deals = await asBuyer('/api/contract/deals');
  ensureStatus(deals, 200, 'buyer deal list');
  const deal = Array.isArray(deals.data) ? deals.data.find((item) => item.quoteId === quote.id) : null;
  ensure(deal?.id, 'Deal was not created after quote acceptance.');

  const fundDeal = await asBuyer(`/api/contract/deals/${deal.id}/fund`, {
    method: 'POST'
  });
  ensureStatus(fundDeal, [200, 201], 'fund deal');

  const dealAfterFund = await asBuyer('/api/contract/deals');
  ensureStatus(dealAfterFund, 200, 'deal list after funding');
  const fundedDeal = Array.isArray(dealAfterFund.data) ? dealAfterFund.data.find((item) => item.id === deal.id) : null;
  ensure(
    fundedDeal?.dealStatus === 'accepted' || fundedDeal?.dealStatus === 'funding_requested',
    `Deal should remain awaiting review after funding submission, got ${fundedDeal?.dealStatus ?? 'missing'}.`
  );

  const reviewQueue = await asAdmin('/api/admin/payments/review?scope=deal&reviewOnly=true');
  ensureStatus(reviewQueue, 200, 'payment review queue');
  const reviewItems = Array.isArray(reviewQueue.data) ? reviewQueue.data : reviewQueue.data?.items ?? [];
  const dealPayment = reviewItems.find((item) => item.dealId === deal.id);
  ensure(dealPayment?.id, 'Admin payment review queue did not include the deal funding request.');

  const markPaid = await asAdmin(`/api/admin/payments/${dealPayment.id}/mark-paid`, {
    method: 'POST',
    body: JSON.stringify({
      note: 'B2B smoke approval'
    })
  });
  ensureStatus(markPaid, [200, 201], 'mark deal payment paid');

  const dealAfterApproval = await asBuyer('/api/contract/deals');
  ensureStatus(dealAfterApproval, 200, 'deal list after approval');
  const approvedDeal = Array.isArray(dealAfterApproval.data) ? dealAfterApproval.data.find((item) => item.id === deal.id) : null;
  ensure(approvedDeal?.dealStatus === 'in_escrow', `Deal was not moved to in_escrow after admin approval, got ${approvedDeal?.dealStatus ?? 'missing'}.`);

  const shipDeal = await asSupplier(`/api/contract/deals/${deal.id}/ship`, {
    method: 'POST'
  });
  ensureStatus(shipDeal, [200, 201], 'ship deal');

  const dealAfterShip = await asBuyer('/api/contract/deals');
  ensureStatus(dealAfterShip, 200, 'deal list after shipping');
  const shippedDeal = Array.isArray(dealAfterShip.data) ? dealAfterShip.data.find((item) => item.id === deal.id) : null;
  ensure(shippedDeal?.dealStatus === 'shipped', `Deal was not moved to shipped, got ${shippedDeal?.dealStatus ?? 'missing'}.`);

  const confirmDeal = await asBuyer(`/api/contract/deals/${deal.id}/confirm`, {
    method: 'POST'
  });
  ensureStatus(confirmDeal, [200, 201], 'confirm deal');

  const finalDeals = await asBuyer('/api/contract/deals');
  ensureStatus(finalDeals, 200, 'final deal list');
  const completedDeal = Array.isArray(finalDeals.data) ? finalDeals.data.find((item) => item.id === deal.id) : null;
  ensure(completedDeal?.dealStatus === 'completed', `Deal was not completed, got ${completedDeal?.dealStatus ?? 'missing'}.`);

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        productId: product.id,
        rfqId: rfq.id,
        quoteId: quote.id,
        dealId: deal.id,
        buyerRfqsBefore: buyerCountBefore,
        buyerRfqsAfter: Array.isArray(buyerRfqsAfter.data) ? buyerRfqsAfter.data.length : 0,
        supplierInboxCount: Array.isArray(supplierInbox.data) ? supplierInbox.data.length : 0,
        dealStatus: completedDeal.dealStatus
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
