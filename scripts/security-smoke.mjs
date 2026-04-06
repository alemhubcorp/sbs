const base = process.env.RUFLO_BASE_URL ?? 'http://localhost:3000';
const keycloak = process.env.RUFLO_KEYCLOAK_URL ?? 'http://localhost:8080';

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { status: response.status, data };
}

async function getToken(username, password, clientId = 'ruflo-admin-ui', clientSecret = 'change-me-admin-client') {
  return request(`${keycloak}/realms/ruflo/protocol/openid-connect/token`, {
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
}

async function main() {
  const adminTokenResponse = await getToken('admin@ruflo.local', 'change-me-admin');
  const buyerTokenResponse = await getToken('buyer@ruflo.local', 'change-me-buyer');

  const adminToken = adminTokenResponse.data.access_token;
  const buyerToken = buyerTokenResponse.data.access_token;

  if (!adminToken || !buyerToken) {
    throw new Error('Could not obtain admin and buyer tokens.');
  }

  const authed = (token) => (path, options = {}) =>
    request(`${base}${path}`, {
      ...options,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        ...(options.headers ?? {})
      }
    });

  const asAdmin = authed(adminToken);
  const asBuyer = authed(buyerToken);

  const results = {
    noToken: await request(`${base}/api/tenants`),
    fakeToken: await request(`${base}/api/tenants`, {
      headers: {
        authorization: 'Bearer fake.fake.fake'
      }
    }),
    buyerAdminApprovals: await asBuyer('/api/admin/approvals'),
    buyerWholesaleDeals: await asBuyer('/api/wholesale/deals'),
    invalidWholesalePayload: await asAdmin('/api/wholesale/rfqs', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: '',
        title: '',
        currency: 'US'
      })
    })
  };

  const contractList = await asAdmin('/api/contracts');
  const firstContractId = contractList.data?.[0]?.id;

  if (firstContractId) {
    results.contractActivate = await asAdmin(`/api/contracts/${firstContractId}/status`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'active'
      })
    });
  }

  const transactionList = await asAdmin('/api/payments/transactions');
  const firstPaymentId = transactionList.data?.[0]?.id;

  if (firstPaymentId) {
    results.paymentRefund = await asAdmin(`/api/payments/transactions/${firstPaymentId}/refund`, {
      method: 'POST',
      body: JSON.stringify({
        amountMinor: 100,
        note: 'security probe refund'
      })
    });

    if (results.paymentRefund.data?.approval?.id) {
      const approvalId = results.paymentRefund.data.approval.id;
      results.paymentRefundApproval = await asAdmin(`/api/admin/approvals/${approvalId}/approve`, {
        method: 'POST',
        body: '{}'
      });
      results.paymentRefundApprovalReplay = await asAdmin(`/api/admin/approvals/${approvalId}/approve`, {
        method: 'POST',
        body: '{}'
      });
    }
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
