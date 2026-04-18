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

  return {
    status: response.status,
    data,
    headers: Object.fromEntries(response.headers.entries())
  };
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

function authedRequest(token) {
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

function ensureStatus(result, expected, label) {
  const allowed = Array.isArray(expected) ? expected : [expected];
  if (!allowed.includes(result.status)) {
    throw new Error(`${label} expected ${allowed.join('/')} but got ${result.status}: ${JSON.stringify(result.data)}`);
  }
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const adminTokenResponse = await getToken('admin@ruflo.local', 'change-me-admin');
  const buyerTokenResponse = await getToken('buyer@ruflo.local', 'change-me-buyer', 'ruflo-web-ui', 'change-me-web-client');

  ensureStatus(adminTokenResponse, 200, 'admin token');
  ensureStatus(buyerTokenResponse, 200, 'buyer token');

  const adminToken = adminTokenResponse.data?.access_token;
  const buyerToken = buyerTokenResponse.data?.access_token;
  ensure(adminToken, 'Missing admin access token.');
  ensure(buyerToken, 'Missing buyer access token.');

  const asAdmin = authedRequest(adminToken);
  const asBuyer = authedRequest(buyerToken);
  const summary = {};

  summary.publicProducts = await request(`${base}/api/catalog/public/products`);
  ensureStatus(summary.publicProducts, 200, 'public products');

  summary.unauthorizedTenants = await request(`${base}/api/tenants`);
  ensureStatus(summary.unauthorizedTenants, 401, 'unauthorized tenants');

  summary.fakeTokenTenants = await request(`${base}/api/tenants`, {
    headers: { authorization: 'Bearer fake.fake.fake' }
  });
  ensureStatus(summary.fakeTokenTenants, 401, 'fake token tenants');

  summary.buyerAdminApprovals = await asBuyer('/api/admin/approvals');
  ensureStatus(summary.buyerAdminApprovals, 403, 'buyer admin approvals');

  summary.buyerCreateCategory = await asBuyer('/api/catalog/categories', {
    method: 'POST',
    body: JSON.stringify({
      name: 'forbidden-category',
      slug: `forbidden-${Date.now()}`
    })
  });
  ensureStatus(summary.buyerCreateCategory, 403, 'buyer create category');

  const adminContext = await asAdmin('/api/identity/context');
  ensureStatus(adminContext, 200, 'admin identity context');
  const buyerContext = await asBuyer('/api/identity/context');
  ensureStatus(buyerContext, 200, 'buyer identity context');

  const tenantId = adminContext.data?.tenantId;
  ensure(tenantId, 'Admin tenantId missing from auth context.');

  summary.invalidWholesalePayload = await asAdmin('/api/wholesale/rfqs', {
    method: 'POST',
    body: JSON.stringify({
      tenantId: '',
      title: '',
      currency: 'US'
    })
  });
  ensureStatus(summary.invalidWholesalePayload, 400, 'invalid wholesale payload');

  const sellerProfiles = await asAdmin('/api/catalog/seller-profiles');
  ensureStatus(sellerProfiles, 200, 'seller profiles');
  const sellerProfileId = sellerProfiles.data?.[0]?.id;
  ensure(sellerProfileId, 'Missing seller profile for runtime validation.');

  const unique = Date.now();
  const shadowTenant = await asAdmin('/api/tenants', {
    method: 'POST',
    body: JSON.stringify({
      name: `Shadow Tenant ${unique}`,
      slug: `shadow-${unique}`,
      organizationName: `Shadow Org ${unique}`
    })
  });
  ensureStatus(shadowTenant, 201, 'create shadow tenant');
  const shadowTenantId = shadowTenant.data?.id;
  ensure(shadowTenantId, 'Shadow tenant ID missing.');
  summary.shadowTenant = { status: shadowTenant.status, id: shadowTenantId };

  summary.crossTenantBuyerRead = await asBuyer(`/api/tenants/${shadowTenantId}`);
  ensureStatus(summary.crossTenantBuyerRead, 403, 'cross-tenant buyer read');

  const rfq = await asAdmin('/api/wholesale/rfqs', {
    method: 'POST',
    body: JSON.stringify({
      tenantId,
      title: `Deep Runtime RFQ ${unique}`,
      description: 'Extended runtime validation',
      currency: 'USD'
    })
  });
  ensureStatus(rfq, 201, 'create RFQ');
  const rfqId = rfq.data?.id;
  ensure(rfqId, 'RFQ ID missing.');

  const quote = await asAdmin(`/api/wholesale/rfqs/${rfqId}/quotes`, {
    method: 'POST',
    body: JSON.stringify({
      sellerProfileId,
      amountMinor: 125000,
      currency: 'USD',
      message: 'Extended validation quote'
    })
  });
  ensureStatus(quote, 201, 'submit quote');
  const quoteId = quote.data?.id;
  ensure(quoteId, 'Quote ID missing.');

  summary.invalidQuoteAccept = await asAdmin('/api/wholesale/quotes/not-a-real-id/accept', {
    method: 'POST',
    body: '{}'
  });
  ensureStatus(summary.invalidQuoteAccept, 404, 'invalid quote accept');

  const firstAccept = await asAdmin(`/api/wholesale/quotes/${quoteId}/accept`, {
    method: 'POST',
    body: '{}'
  });
  ensureStatus(firstAccept, [200, 201], 'first quote accept');
  ensure(firstAccept.data?.status === 'pending_approval', 'First quote accept did not create pending approval.');
  const quoteApprovalId = firstAccept.data?.approval?.id;
  ensure(quoteApprovalId, 'Quote approval ID missing.');

  const secondAccept = await asAdmin(`/api/wholesale/quotes/${quoteId}/accept`, {
    method: 'POST',
    body: '{}'
  });
  ensureStatus(secondAccept, [200, 201], 'second quote accept');
  ensure(
    secondAccept.data?.approval?.id === quoteApprovalId,
    'Duplicate quote accept did not return the existing pending approval.'
  );
  summary.duplicateQuoteAccept = {
    status: secondAccept.status,
    approvalId: secondAccept.data?.approval?.id
  };

  summary.buyerApprovalBypass = await asBuyer(`/api/admin/approvals/${quoteApprovalId}/approve`, {
    method: 'POST',
    body: '{}'
  });
  ensureStatus(summary.buyerApprovalBypass, 403, 'buyer approval bypass');

  const approveQuote = await asAdmin(`/api/admin/approvals/${quoteApprovalId}/approve`, {
    method: 'POST',
    body: '{}'
  });
  ensureStatus(approveQuote, 201, 'approve quote approval');

  summary.approvalReplay = await asAdmin(`/api/admin/approvals/${quoteApprovalId}/approve`, {
    method: 'POST',
    body: '{}'
  });
  ensureStatus(summary.approvalReplay, 400, 'approval replay');

  const deals = await asAdmin('/api/wholesale/deals');
  ensureStatus(deals, 200, 'list deals');
  const deal = deals.data?.find((item) => item.acceptedQuoteId === quoteId);
  ensure(deal?.id, 'Deal was not created after approval.');
  const dealId = deal.id;

  const contract = await asAdmin('/api/contracts', {
    method: 'POST',
    body: JSON.stringify({
      dealId,
      contractType: 'master_purchase',
      title: `Deep Runtime Contract ${unique}`
    })
  });
  ensureStatus(contract, 201, 'create contract');
  const contractId = contract.data?.id;
  ensure(contractId, 'Contract ID missing.');

  const activateContract = await asAdmin(`/api/contracts/${contractId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'active' })
  });
  ensureStatus(activateContract, [200, 201], 'activate contract');
  ensure(
    activateContract.data?.status === 'pending_approval',
    'Contract activation should enter pending approval when policy is enabled.'
  );
  summary.contractActivation = {
    status: activateContract.status,
    approvalId: activateContract.data?.approval?.id
  };

  const contractVersion = await asAdmin(`/api/contracts/${contractId}/versions`, {
    method: 'POST',
    body: JSON.stringify({
      label: 'v1',
      storageBucket: 'documents',
      storageKey: `contracts/deep-runtime-${unique}.pdf`
    })
  });
  ensureStatus(contractVersion, 201, 'create contract version');

  const document = await asAdmin('/api/documents', {
    method: 'POST',
    body: JSON.stringify({
      tenantId,
      documentType: 'contract',
      name: `Deep Runtime Document ${unique}`,
      storageBucket: 'documents',
      storageKey: `documents/deep-runtime-${unique}.pdf`
    })
  });
  ensureStatus(document, 201, 'create document');
  const documentId = document.data?.id;
  ensure(documentId, 'Document ID missing.');

  const link = await asAdmin(`/api/documents/${documentId}/links`, {
    method: 'POST',
    body: JSON.stringify({
      dealId,
      contractId,
      linkType: 'contract_attachment'
    })
  });
  ensureStatus(link, 201, 'create document link');

  const documentStatus = await asAdmin(`/api/documents/${documentId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'approved' })
  });
  ensureStatus(documentStatus, 200, 'update document status');

  const payment = await asAdmin('/api/payments/transactions', {
    method: 'POST',
    body: JSON.stringify({
      dealId,
      currency: 'USD',
      totalAmountMinor: 125000
    })
  });
  ensureStatus(payment, 201, 'create payment transaction');
  const paymentId = payment.data?.id;
  ensure(paymentId, 'Payment ID missing.');

  const hold = await asAdmin(`/api/payments/transactions/${paymentId}/hold`, {
    method: 'POST',
    body: JSON.stringify({
      amountMinor: 125000,
      note: 'Deep runtime hold'
    })
  });
  ensureStatus(hold, 201, 'hold funds');

  summary.invalidPaymentRelease = await asAdmin(`/api/payments/transactions/${paymentId}/release`, {
    method: 'POST',
    body: JSON.stringify({
      amountMinor: 999999999,
      note: 'too much'
    })
  });
  ensureStatus(summary.invalidPaymentRelease, 409, 'invalid payment release');

  const firstRelease = await asAdmin(`/api/payments/transactions/${paymentId}/release`, {
    method: 'POST',
    body: JSON.stringify({
      amountMinor: 125000,
      note: 'Deep runtime release'
    })
  });
  ensureStatus(firstRelease, [200, 201], 'first payment release');
  ensure(firstRelease.data?.status === 'pending_approval', 'First payment release did not create pending approval.');
  const releaseApprovalId = firstRelease.data?.approval?.id;
  ensure(releaseApprovalId, 'Release approval ID missing.');

  const secondRelease = await asAdmin(`/api/payments/transactions/${paymentId}/release`, {
    method: 'POST',
    body: JSON.stringify({
      amountMinor: 125000,
      note: 'Deep runtime release retry'
    })
  });
  ensureStatus(secondRelease, [200, 201], 'second payment release');
  ensure(
    secondRelease.data?.approval?.id === releaseApprovalId,
    'Duplicate payment release did not return the existing pending approval.'
  );
  summary.duplicatePaymentRelease = {
    status: secondRelease.status,
    approvalId: secondRelease.data?.approval?.id
  };

  const approveRelease = await asAdmin(`/api/admin/approvals/${releaseApprovalId}/approve`, {
    method: 'POST',
    body: '{}'
  });
  ensureStatus(approveRelease, 201, 'approve payment release');

  summary.releaseApprovalReplay = await asAdmin(`/api/admin/approvals/${releaseApprovalId}/approve`, {
    method: 'POST',
    body: '{}'
  });
  ensureStatus(summary.releaseApprovalReplay, 400, 'release approval replay');

  summary.postReleaseRefund = await asAdmin(`/api/payments/transactions/${paymentId}/refund`, {
    method: 'POST',
    body: JSON.stringify({
      amountMinor: 100,
      note: 'refund after full release'
    })
  });
  ensureStatus(summary.postReleaseRefund, 409, 'post-release refund');

  const logisticsProviders = await asAdmin('/api/logistics/providers');
  ensureStatus(logisticsProviders, 200, 'list logistics providers');
  const logisticsProviderId = logisticsProviders.data?.[0]?.id;

  if (logisticsProviderId) {
    const firstSelection = await asAdmin(`/api/wholesale/deals/${dealId}/logistics-selection`, {
      method: 'POST',
      body: JSON.stringify({
        logisticsProviderId,
        notes: 'Deep runtime selection'
      })
    });
    ensureStatus(firstSelection, [200, 201], 'first logistics selection');
    ensure(
      firstSelection.data?.status === 'pending_approval',
      'First logistics selection did not create pending approval.'
    );
    const logisticsApprovalId = firstSelection.data?.approval?.id;
    ensure(logisticsApprovalId, 'Logistics approval ID missing.');

    const secondSelection = await asAdmin(`/api/wholesale/deals/${dealId}/logistics-selection`, {
      method: 'POST',
      body: JSON.stringify({
        logisticsProviderId,
        notes: 'Deep runtime selection retry'
      })
    });
    ensureStatus(secondSelection, [200, 201], 'second logistics selection');
    ensure(
      secondSelection.data?.approval?.id === logisticsApprovalId,
      'Duplicate logistics selection did not return the existing pending approval.'
    );
    summary.duplicateLogisticsSelection = {
      status: secondSelection.status,
      approvalId: secondSelection.data?.approval?.id
    };
  } else {
    summary.duplicateLogisticsSelection = {
      skipped: true,
      reason: 'No logistics providers available.'
    };
  }

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        tenantId,
        shadowTenantId,
        rfqId,
        quoteId,
        quoteApprovalId,
        dealId,
        contractId,
        documentId,
        paymentId,
        releaseApprovalId,
        checks: summary
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
