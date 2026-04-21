function normalizeBaseUrl(value, fallback) {
  const raw = value ?? fallback;
  return raw.replace(/\/+$/, '').replace(/\/api$/, '');
}

const authBase = normalizeBaseUrl(process.env.RUFLO_KEYCLOAK_URL, 'https://alemhub.sbs/auth');
const apiBase = normalizeBaseUrl(process.env.RUFLO_BASE_URL, 'https://alemhub.sbs');

async function jsonResponse(response) {
  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { status: response.status, ok: response.ok, data, text };
}

async function token(username, password, clientId = 'ruflo-web-ui', clientSecret = 'change-me-web-client') {
  const response = await fetch(`${authBase}/realms/ruflo/protocol/openid-connect/token`, {
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

  const out = await jsonResponse(response);
  if (!response.ok) {
    throw new Error(`Token request failed for ${username}: ${out.status} ${out.text}`);
  }

  return out.data.access_token;
}

async function adminToken() {
  return token('admin@ruflo.local', 'change-me-admin', 'ruflo-admin-ui', 'change-me-admin-client');
}

async function request(path, tokenValue, init = {}) {
  const headers = {
    ...(init.headers ?? {}),
    authorization: `Bearer ${tokenValue}`
  };

  if (init.body) {
    headers['content-type'] = 'application/json';
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers
  });

  return jsonResponse(response);
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function ensureStatus(response, expected, label) {
  const allowed = Array.isArray(expected) ? expected : [expected];
  ensure(allowed.includes(response.status), `${label} expected ${allowed.join(', ')}, got ${response.status}: ${response.text}`);
}

const buyerToken = await token('buyer@ruflo.local', 'change-me-buyer');
const supplierToken = await token('supplier@ruflo.local', 'change-me-supplier');

const productsResponse = await fetch(`${apiBase}/api/catalog/public/products`, { cache: 'no-store' });
const products = await productsResponse.json();
const b2cProduct = products.find(
  (product) =>
    product.targetMarket === 'b2c'
    && product.status === 'published'
    && product.availabilityStatus !== 'preorder'
    && !product.isPreorderEnabled
);

ensure(b2cProduct?.id, 'No published retail-purchasable B2C product was found in the catalog.');

const cartAdd = await request('/api/retail/orders/cart/items', buyerToken, {
  method: 'POST',
  body: JSON.stringify({
    productId: b2cProduct.id,
    quantity: 1
  })
});
ensureStatus(cartAdd, [200, 201], 'add to cart');

const cart = await request('/api/retail/orders/cart', buyerToken);
ensureStatus(cart, 200, 'get cart');
ensure(cart.data?.items?.length, 'Cart did not persist the added item.');

const cartId = cart.data.id;

const checkout = await request(`/api/retail/orders/${cartId}/checkout`, buyerToken, {
  method: 'POST',
  body: JSON.stringify({
    name: 'Demo Buyer',
    line1: '1 Main St',
    city: 'Austin',
    region: 'TX',
    country: 'USA',
    postalCode: '73301',
    phone: '+1-737-237-0456'
  })
});
ensureStatus(checkout, [200, 201], 'checkout');
ensure(checkout.data?.status === 'pending', `Checkout did not move order to pending, got ${checkout.data?.status}.`);

const payment = await request(`/api/retail/orders/${cartId}/pay`, buyerToken, {
  method: 'POST',
  body: JSON.stringify({})
});
ensureStatus(payment, [200, 201], 'payment');
ensure(payment.data?.paymentTransactionId, 'Payment transaction ID missing.');

const buyerOrdersAfterPayment = await request('/api/retail/orders', buyerToken);
ensureStatus(buyerOrdersAfterPayment, 200, 'buyer orders after payment');
const pendingOrder = buyerOrdersAfterPayment.data.find((order) => order.id === cartId);
ensure(pendingOrder, 'Buyer could not see the submitted order after payment.');
ensure(
  pendingOrder.status === 'pending' || pendingOrder.status === 'processing',
  `Order should remain pending after buyer payment submission, got ${pendingOrder.status}.`
);
ensure(pendingOrder.paymentStatus !== 'paid', `Order should not be marked paid before admin review, got ${pendingOrder.paymentStatus}.`);

const adminTokenValue = await adminToken();
const adminPayments = await request('/api/admin/payments?scope=order&reviewOnly=true', adminTokenValue);
ensureStatus(adminPayments, 200, 'admin payment review queue');
const adminPaymentItems = Array.isArray(adminPayments.data) ? adminPayments.data : adminPayments.data?.items ?? [];
const paymentRecord = adminPaymentItems.find((item) => item.orderId === cartId);
ensure(paymentRecord?.id, 'Admin review queue did not include the buyer payment.');

const markedPaid = await request(`/api/admin/payments/${paymentRecord.id}/mark-paid`, adminTokenValue, {
  method: 'POST',
  body: JSON.stringify({
    note: 'B2C smoke approval'
  })
});
ensureStatus(markedPaid, [200, 201], 'mark payment paid');

const buyerOrdersAfterApproval = await request('/api/retail/orders', buyerToken);
ensureStatus(buyerOrdersAfterApproval, 200, 'buyer orders after approval');
const approvedOrder = buyerOrdersAfterApproval.data.find((order) => order.id === cartId);
ensure(approvedOrder?.paymentStatus === 'paid', `Order did not become paid after admin review, got ${approvedOrder?.paymentStatus ?? 'missing'}.`);
ensure(approvedOrder?.status === 'paid' || approvedOrder?.status === 'ready_to_ship' || approvedOrder?.status === 'processing', `Order state after approval was unexpected: ${approvedOrder?.status ?? 'missing'}.`);

const supplierOrders = await request('/api/retail/orders', supplierToken);
ensureStatus(supplierOrders, 200, 'supplier orders');
const supplierOrder = supplierOrders.data.find((order) => order.id === cartId);
ensure(supplierOrder, 'Supplier could not see the order.');

const shipped = await request(`/api/retail/orders/${cartId}/ship`, supplierToken, {
  method: 'POST'
});
ensureStatus(shipped, [200, 201], 'ship order');
ensure(shipped.data?.status === 'shipped', `Ship did not move order to shipped, got ${shipped.data?.status}.`);

const confirmed = await request(`/api/retail/orders/${cartId}/confirm`, buyerToken, {
  method: 'POST'
});
ensureStatus(confirmed, [200, 201], 'confirm delivery');
ensure(confirmed.data?.status === 'delivered', `Confirm did not move order to delivered, got ${confirmed.data?.status}.`);

const finalBuyerOrders = await request('/api/retail/orders', buyerToken);
ensureStatus(finalBuyerOrders, 200, 'buyer orders');
const finalOrder = finalBuyerOrders.data.find((order) => order.id === cartId);
ensure(finalOrder?.status === 'delivered', `Final order status was not delivered, got ${finalOrder?.status ?? 'missing'}.`);

console.log(
  JSON.stringify(
    {
      status: 'ok',
      productId: b2cProduct.id,
      cartId,
      transactionId: payment.data.paymentTransactionId,
      finalStatus: finalOrder.status
    },
    null,
    2
  )
);
