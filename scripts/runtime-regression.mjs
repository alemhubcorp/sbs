const base = process.env.RUFLO_BASE_URL ?? 'http://localhost:3000';
const keycloak = process.env.RUFLO_KEYCLOAK_URL ?? 'https://alemhub.sbs/auth';

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { status: response.status, data, headers: Object.fromEntries(response.headers.entries()) };
}

async function getToken(username, password, clientId = 'ruflo-admin-ui', clientSecret = 'change-me-admin-client') {
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

  if (!response.data?.access_token) {
    throw new Error(`Unable to obtain token for ${username}: ${JSON.stringify(response.data)}`);
  }

  return response.data.access_token;
}

function withAuth(token) {
  return (path, options = {}) =>
    request(`${base}${path}`, {
      ...options,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        ...(options.headers ?? {})
      }
    });
}

function assertStatus(label, response, expectedStatuses) {
  const allowed = Array.isArray(expectedStatuses) ? expectedStatuses : [expectedStatuses];

  if (!allowed.includes(response.status)) {
    throw new Error(`${label} expected ${allowed.join('/')} but got ${response.status}: ${JSON.stringify(response.data)}`);
  }
}

async function main() {
  const adminToken = await getToken('admin@ruflo.local', 'change-me-admin');
  const buyerToken = await getToken('buyer@ruflo.local', 'change-me-buyer', 'ruflo-web-ui', 'change-me-web-client');

  const asAdmin = withAuth(adminToken);
  const asBuyer = withAuth(buyerToken);

  const summary = {
    base,
    keycloak,
    checks: {}
  };

  summary.checks.publicProducts = await request(`${base}/api/catalog/public/products`);
  assertStatus('publicProducts', summary.checks.publicProducts, 200);

  summary.checks.unauthorizedTenants = await request(`${base}/api/tenants`);
  assertStatus('unauthorizedTenants', summary.checks.unauthorizedTenants, 401);

  summary.checks.invalidTokenTenants = await request(`${base}/api/tenants`, {
    headers: { authorization: 'Bearer fake.fake.fake' }
  });
  assertStatus('invalidTokenTenants', summary.checks.invalidTokenTenants, 401);

  summary.checks.buyerAdminApprovals = await asBuyer('/api/admin/approvals');
  assertStatus('buyerAdminApprovals', summary.checks.buyerAdminApprovals, 403);

  summary.checks.buyerCreateCategory = await asBuyer('/api/catalog/categories', {
    method: 'POST',
    body: JSON.stringify({ name: 'forbidden', slug: `forbidden-${Date.now()}` })
  });
  assertStatus('buyerCreateCategory', summary.checks.buyerCreateCategory, 403);

  summary.checks.invalidRfqPayload = await asAdmin('/api/wholesale/rfqs', {
    method: 'POST',
    body: JSON.stringify({
      tenantId: '',
      title: '',
      currency: 'US'
    })
  });
  assertStatus('invalidRfqPayload', summary.checks.invalidRfqPayload, 400);

  summary.checks.invalidQuoteAccept = await asAdmin('/api/wholesale/quotes/not-a-real-id/accept', {
    method: 'POST',
    body: '{}'
  });
  assertStatus('invalidQuoteAccept', summary.checks.invalidQuoteAccept, 404);

  const adminContext = await asAdmin('/api/identity/context');
  assertStatus('adminContext', adminContext, 200);

  const contracts = await asAdmin('/api/contracts');
  assertStatus('contracts', contracts, 200);
  const firstContractId = contracts.data?.[0]?.id;

  if (firstContractId) {
    const pendingActivation = await asAdmin(`/api/contracts/${firstContractId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'active' })
    });
    assertStatus('pendingActivation', pendingActivation, [200, 201]);
    summary.checks.contractActivate = pendingActivation;

    if (pendingActivation.data?.approval?.id) {
      const approvalId = pendingActivation.data.approval.id;

      const approvalByBuyer = await asBuyer(`/api/admin/approvals/${approvalId}/approve`, {
        method: 'POST',
        body: '{}'
      });
      assertStatus('approvalByBuyer', approvalByBuyer, 403);
      summary.checks.approvalByBuyer = approvalByBuyer;

      const approve = await asAdmin(`/api/admin/approvals/${approvalId}/approve`, {
        method: 'POST',
        body: '{}'
      });
      assertStatus('approveContractActivation', approve, [200, 201]);
      summary.checks.approveContractActivation = approve;

      const replay = await asAdmin(`/api/admin/approvals/${approvalId}/approve`, {
        method: 'POST',
        body: '{}'
      });
      assertStatus('approvalReplay', replay, 400);
      summary.checks.approvalReplay = replay;
    }
  }

  const deals = await asAdmin('/api/wholesale/deals');
  assertStatus('deals', deals, 200);
  const firstDealId = deals.data?.[0]?.id;

  if (firstDealId) {
    const invalidSelection = await asAdmin(`/api/wholesale/deals/${firstDealId}/logistics-selection`, {
      method: 'POST',
      body: JSON.stringify({
        logisticsProviderId: 'not-a-real-provider'
      })
    });
    assertStatus('invalidSelection', invalidSelection, [404, 409]);
    summary.checks.invalidLogisticsSelection = invalidSelection;
  }

  const payments = await asAdmin('/api/payments/transactions');
  assertStatus('payments', payments, 200);
  const firstPaymentId = payments.data?.[0]?.id;

  if (firstPaymentId) {
    const invalidRelease = await asAdmin(`/api/payments/transactions/${firstPaymentId}/release`, {
      method: 'POST',
      body: JSON.stringify({
        amountMinor: 999999999,
        note: 'too much'
      })
    });
    assertStatus('invalidRelease', invalidRelease, 409);
    summary.checks.invalidPaymentRelease = invalidRelease;
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
