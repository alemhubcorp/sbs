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
    throw new Error(`Failed to obtain token for ${username}: ${JSON.stringify(response.data)}`);
  }

  return response.data.access_token;
}

function authed(token) {
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

function summarize(result) {
  return {
    status: result.status,
    data: result.data
  };
}

async function main() {
  const adminToken = await getToken('admin@ruflo.local', 'change-me-admin');
  const buyerToken = await getToken('buyer@ruflo.local', 'change-me-buyer', 'ruflo-web-ui', 'change-me-web-client');
  const asAdmin = authed(adminToken);
  const asBuyer = authed(buyerToken);

  const context = await asAdmin('/api/identity/context');
  const tenantId = context.data?.tenantId;
  const sellers = await asAdmin('/api/catalog/seller-profiles');
  const sellerId = sellers.data?.[0]?.id;
  const deals = await asAdmin('/api/wholesale/deals');
  const dealId = deals.data?.[0]?.id;
  const contracts = await asAdmin('/api/contracts');
  const contractId = contracts.data?.[0]?.id;
  const payments = await asAdmin('/api/payments/transactions');
  const paymentId = payments.data?.[0]?.id;

  if (!tenantId || !sellerId || !dealId || !contractId || !paymentId) {
    throw new Error('Missing baseline entities for deep validation.');
  }

  const unique = Date.now();

  const badRequests = {
    authMissing: summarize(await request(`${base}/api/identity/context`)),
    authFake: summarize(
      await request(`${base}/api/identity/context`, {
        headers: { authorization: 'Bearer fake.fake.fake' }
      })
    ),
    buyerAdminApprovals: summarize(await asBuyer('/api/admin/approvals')),
    buyerIdentityUsers: summarize(await asBuyer('/api/identity/users')),
    malformedRfq: summarize(
      await asAdmin('/api/wholesale/rfqs', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: '',
          title: '',
          currency: 'US'
        })
      })
    ),
    wrongTenantRfq: summarize(
      await asBuyer('/api/wholesale/rfqs', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'non-existent-tenant',
          title: `Illegal Buyer RFQ ${unique}`,
          currency: 'USD'
        })
      })
    ),
    malformedQuoteAccept: summarize(
      await asAdmin('/api/wholesale/quotes/not-a-real-id/accept', {
        method: 'POST',
        body: '{}'
      })
    ),
    malformedContractStatus: summarize(
      await asAdmin(`/api/contracts/${contractId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'not-a-status' })
      })
    ),
    malformedDocument: summarize(
      await asAdmin('/api/documents', {
        method: 'POST',
        body: JSON.stringify({
          tenantId,
          documentType: 'bad-type',
          name: ''
        })
      })
    ),
    malformedPaymentCreate: summarize(
      await asAdmin('/api/payments/transactions', {
        method: 'POST',
        body: JSON.stringify({
          dealId,
          currency: 'US',
          totalAmountMinor: -1
        })
      })
    ),
    invalidPaymentReleaseAmount: summarize(
      await asAdmin(`/api/payments/transactions/${paymentId}/release`, {
        method: 'POST',
        body: JSON.stringify({
          amountMinor: 999999999,
          note: 'too much'
        })
      })
    ),
    invalidPaymentRefundAmount: summarize(
      await asAdmin(`/api/payments/transactions/${paymentId}/refund`, {
        method: 'POST',
        body: JSON.stringify({
          amountMinor: 999999999,
          note: 'too much'
        })
      })
    ),
    invalidLogisticsProvider: summarize(
      await asAdmin(`/api/wholesale/deals/${dealId}/logistics-selection`, {
        method: 'POST',
        body: JSON.stringify({
          logisticsProviderId: 'not-real'
        })
      })
    ),
    duplicateHoldOnReleasedPayment: summarize(
      await asAdmin(`/api/payments/transactions/${paymentId}/hold`, {
        method: 'POST',
        body: JSON.stringify({
          amountMinor: 1,
          note: 'duplicate hold probe'
        })
      })
    )
  };

  const rfq = await asAdmin('/api/wholesale/rfqs', {
    method: 'POST',
    body: JSON.stringify({
      tenantId,
      title: `Deep Validation RFQ ${unique}`,
      description: 'Phase 1 negative-path validation',
      currency: 'USD'
    })
  });

  if (rfq.status !== 201 || !rfq.data?.id) {
    throw new Error(`RFQ setup failed: ${JSON.stringify(rfq)}`);
  }

  const quote = await asAdmin(`/api/wholesale/rfqs/${rfq.data.id}/quotes`, {
    method: 'POST',
    body: JSON.stringify({
      sellerProfileId: sellerId,
      amountMinor: 250000,
      currency: 'USD',
      message: 'Deep validation quote'
    })
  });

  if (quote.status !== 201 || !quote.data?.id) {
    throw new Error(`Quote setup failed: ${JSON.stringify(quote)}`);
  }

  const firstAccept = await asAdmin(`/api/wholesale/quotes/${quote.data.id}/accept`, {
    method: 'POST',
    body: '{}'
  });
  const secondAccept = await asAdmin(`/api/wholesale/quotes/${quote.data.id}/accept`, {
    method: 'POST',
    body: '{}'
  });

  const quoteApprovalId = firstAccept.data?.approval?.id;
  if (!quoteApprovalId) {
    throw new Error(`Quote approval was not created: ${JSON.stringify(firstAccept)}`);
  }

  const quoteApprove = await asAdmin(`/api/admin/approvals/${quoteApprovalId}/approve`, {
    method: 'POST',
    body: '{}'
  });
  const quoteApproveReplay = await asAdmin(`/api/admin/approvals/${quoteApprovalId}/approve`, {
    method: 'POST',
    body: '{}'
  });
  const quoteRejectAfterApprove = await asAdmin(`/api/admin/approvals/${quoteApprovalId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ comment: 'should fail after approval' })
  });

  const freshDeals = await asAdmin('/api/wholesale/deals');
  const newDeal = freshDeals.data?.find((item) => item.acceptedQuoteId === quote.data.id);
  if (!newDeal?.id) {
    throw new Error('New deal was not created after approval.');
  }

  const firstSelection = await asAdmin(`/api/wholesale/deals/${newDeal.id}/logistics-selection`, {
    method: 'POST',
    body: JSON.stringify({ logisticsProviderId: 'not-real' })
  });
  const secondSelection = await asAdmin(`/api/wholesale/deals/${newDeal.id}/logistics-selection`, {
    method: 'POST',
    body: JSON.stringify({ logisticsProviderId: 'not-real' })
  });

  const logisticsApprovalId = firstSelection.data?.approval?.id;
  let logisticsApproveReplay = null;
  if (logisticsApprovalId) {
    await asAdmin(`/api/admin/approvals/${logisticsApprovalId}/approve`, {
      method: 'POST',
      body: '{}'
    });
    logisticsApproveReplay = summarize(
      await asAdmin(`/api/admin/approvals/${logisticsApprovalId}/approve`, {
        method: 'POST',
        body: '{}'
      })
    );
  }

  const firstContractActivate = await asAdmin(`/api/contracts/${contractId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'active' })
  });
  const secondContractActivate = await asAdmin(`/api/contracts/${contractId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'active' })
  });

  const contractApprovalId = firstContractActivate.data?.approval?.id;
  let contractApproveReplay = null;
  if (contractApprovalId) {
    await asAdmin(`/api/admin/approvals/${contractApprovalId}/approve`, {
      method: 'POST',
      body: '{}'
    });
    contractApproveReplay = summarize(
      await asAdmin(`/api/admin/approvals/${contractApprovalId}/approve`, {
        method: 'POST',
        body: '{}'
      })
    );
  }

  const results = {
    badRequests,
    approvalBehavior: {
      firstAccept: summarize(firstAccept),
      secondAccept: summarize(secondAccept),
      quoteApprove: summarize(quoteApprove),
      quoteApproveReplay: summarize(quoteApproveReplay),
      quoteRejectAfterApprove: summarize(quoteRejectAfterApprove),
      firstSelection: summarize(firstSelection),
      secondSelection: summarize(secondSelection),
      logisticsApproveReplay,
      firstContractActivate: summarize(firstContractActivate),
      secondContractActivate: summarize(secondContractActivate),
      contractApproveReplay
    },
    created: {
      rfqId: rfq.data.id,
      quoteId: quote.data.id,
      quoteApprovalId,
      dealId: newDeal.id,
      logisticsApprovalId,
      contractApprovalId
    }
  };

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
