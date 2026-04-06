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

  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${url} -> ${response.status} ${text}`);
  }

  return data;
}

async function getAccessToken() {
  const tokenResponse = await request(`${keycloak}/realms/ruflo/protocol/openid-connect/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: 'ruflo-admin-ui',
      client_secret: 'change-me-admin-client',
      username: 'admin@ruflo.local',
      password: 'change-me-admin'
    })
  });

  if (!tokenResponse.access_token) {
    throw new Error('Keycloak token response did not include access_token.');
  }

  return tokenResponse.access_token;
}

async function main() {
  const token = await getAccessToken();
  const authed = (path, options = {}) =>
    request(`${base}${path}`, {
      ...options,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        ...(options.headers ?? {})
      }
    });

  const identityContext = await authed('/api/identity/context');
  const tenantId = identityContext.tenantId;
  const sellers = await authed('/api/catalog/seller-profiles');
  const seller = sellers[0];

  if (!tenantId || !seller?.id) {
    throw new Error('Missing tenant context or seller profile for E2E validation.');
  }

  const rfq = await authed('/api/wholesale/rfqs', {
    method: 'POST',
    body: JSON.stringify({
      tenantId,
      title: 'E2E RFQ',
      description: 'Wholesale runtime validation flow',
      currency: 'USD'
    })
  });

  const quote = await authed(`/api/wholesale/rfqs/${rfq.id}/quotes`, {
    method: 'POST',
    body: JSON.stringify({
      sellerProfileId: seller.id,
      amountMinor: 125000,
      currency: 'USD',
      message: 'Quote for runtime validation'
    })
  });

  const quoteAcceptance = await authed(`/api/wholesale/quotes/${quote.id}/accept`, {
    method: 'POST',
    body: '{}'
  });

  if (quoteAcceptance.status !== 'pending_approval' || !quoteAcceptance.approval?.id) {
    throw new Error(`Unexpected quote acceptance response: ${JSON.stringify(quoteAcceptance)}`);
  }

  await authed(`/api/admin/approvals/${quoteAcceptance.approval.id}/approve`, {
    method: 'POST',
    body: '{}'
  });

  const deals = await authed('/api/wholesale/deals');
  const deal = deals.find((item) => item.acceptedQuoteId === quote.id);

  if (!deal?.id) {
    throw new Error('Deal was not created after quote approval.');
  }

  const contract = await authed('/api/contracts', {
    method: 'POST',
    body: JSON.stringify({
      dealId: deal.id,
      contractType: 'master_purchase',
      title: 'E2E Master Contract'
    })
  });

  await authed(`/api/contracts/${contract.id}/versions`, {
    method: 'POST',
    body: JSON.stringify({
      label: 'v1',
      storageBucket: 'documents',
      storageKey: 'contracts/e2e-master-contract.pdf'
    })
  });

  const document = await authed('/api/documents', {
    method: 'POST',
    body: JSON.stringify({
      tenantId,
      documentType: 'contract',
      name: 'E2E Contract PDF',
      storageBucket: 'documents',
      storageKey: 'documents/e2e-contract.pdf'
    })
  });

  await authed(`/api/documents/${document.id}/links`, {
    method: 'POST',
    body: JSON.stringify({
      dealId: deal.id,
      contractId: contract.id,
      linkType: 'contract_attachment'
    })
  });

  await authed(`/api/documents/${document.id}/status`, {
    method: 'PUT',
    body: JSON.stringify({
      status: 'approved'
    })
  });

  const payment = await authed('/api/payments/transactions', {
    method: 'POST',
    body: JSON.stringify({
      dealId: deal.id,
      currency: 'USD',
      totalAmountMinor: 125000
    })
  });

  await authed(`/api/payments/transactions/${payment.id}/hold`, {
    method: 'POST',
    body: JSON.stringify({
      amountMinor: 125000,
      note: 'Initial escrow hold'
    })
  });

  const release = await authed(`/api/payments/transactions/${payment.id}/release`, {
    method: 'POST',
    body: JSON.stringify({
      amountMinor: 125000,
      note: 'Release after approval'
    })
  });

  if (release.status !== 'pending_approval' || !release.approval?.id) {
    throw new Error(`Unexpected payment release response: ${JSON.stringify(release)}`);
  }

  await authed(`/api/admin/approvals/${release.approval.id}/approve`, {
    method: 'POST',
    body: '{}'
  });

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        tokenIssuer: identityContext.tokenIssuer,
        rfqId: rfq.id,
        quoteId: quote.id,
        dealId: deal.id,
        contractId: contract.id,
        documentId: document.id,
        paymentId: payment.id,
        quoteApprovalId: quoteAcceptance.approval.id,
        paymentReleaseApprovalId: release.approval.id
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
