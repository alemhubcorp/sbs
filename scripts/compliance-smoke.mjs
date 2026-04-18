const keycloakBase = process.env.RUFLO_KEYCLOAK_URL ?? 'http://keycloak:8080';
const apiBase = process.env.RUFLO_API_BASE_URL ?? 'http://api:3000';
const webBase = process.env.RUFLO_WEB_BASE_URL ?? 'http://web:3001';
const adminBase = process.env.RUFLO_ADMIN_BASE_URL ?? 'http://admin:3002';

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/pdf')) {
    const buffer = await response.arrayBuffer();
    return {
      status: response.status,
      contentType,
      bytes: buffer.byteLength,
      ok: response.ok
    };
  }

  const text = await response.text();
  let body = text;
  try {
    body = JSON.parse(text);
  } catch {
    // keep text
  }

  return {
    status: response.status,
    contentType,
    body,
    ok: response.ok
  };
}

async function passwordGrant(username, password, clientId, clientSecret) {
  const response = await fetch(`${keycloakBase}/realms/ruflo/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: clientId,
      client_secret: clientSecret,
      username,
      password
    })
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(`Token request failed for ${username}: ${response.status} ${JSON.stringify(json)}`);
  }

  return json;
}

function cookieHeader(prefix, token) {
  const expiresAt = Date.now() + Number(token.expires_in ?? 0) * 1000;
  return [
    `${prefix}_access_token=${token.access_token}`,
    `${prefix}_refresh_token=${token.refresh_token}`,
    `${prefix}_expires_at=${expiresAt}`,
    token.id_token ? `${prefix}_id_token=${token.id_token}` : null
  ]
    .filter(Boolean)
    .join('; ');
}

function extractList(body) {
  if (Array.isArray(body)) {
    return body;
  }

  if (body && typeof body === 'object') {
    if (Array.isArray(body.items)) {
      return body.items;
    }

    if (Array.isArray(body.data)) {
      return body.data;
    }
  }

  return [];
}

const [buyerToken, adminToken] = await Promise.all([
  passwordGrant('buyer@ruflo.local', 'change-me-buyer', 'ruflo-web-ui', 'change-me-web-client'),
  passwordGrant('admin@ruflo.local', 'change-me-admin', 'ruflo-admin-ui', 'change-me-admin-client')
]);

const buyerCookies = cookieHeader('ruflo_web', buyerToken);
const adminCookies = cookieHeader('ruflo_admin', adminToken);
const webCookies = buyerCookies;
const complianceCookies = cookieHeader('ruflo_web', adminToken);

let apiBuyerNotifications = await request(`${apiBase}/api/notifications?limit=5`, {
  headers: { authorization: `Bearer ${buyerToken.access_token}` }
});

let webBuyerNotifications = await request(`${webBase}/api/notifications?limit=5`, {
  headers: { cookie: buyerCookies }
});

const apiAudit = await request(`${apiBase}/api/audit/events?limit=5`, {
  headers: { authorization: `Bearer ${adminToken.access_token}` }
});

const apiDocuments = await request(`${apiBase}/api/documents?limit=5`, {
  headers: { authorization: `Bearer ${adminToken.access_token}` }
});

const adminHome = await request(`${adminBase}/`, {
  headers: { cookie: adminCookies }
});

if (apiBuyerNotifications.status === 200 && extractList(apiBuyerNotifications.body).length === 0) {
  const publicProducts = await request(`${apiBase}/api/catalog/public/products`);
  const firstProductId = extractList(publicProducts.body)[0]?.id ?? null;

  if (firstProductId) {
    await request(`${apiBase}/api/retail/orders`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${buyerToken.access_token}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ items: [{ productId: firstProductId, quantity: 1 }] })
    });

    apiBuyerNotifications = await request(`${apiBase}/api/notifications?limit=5`, {
      headers: { authorization: `Bearer ${buyerToken.access_token}` }
    });

    webBuyerNotifications = await request(`${webBase}/api/notifications?limit=5`, {
      headers: { cookie: buyerCookies }
    });
  }
}

let dealsResponse = await request(`${apiBase}/api/wholesale/deals?limit=20`, {
  headers: { authorization: `Bearer ${adminToken.access_token}` }
});
let ordersResponse = await request(`${apiBase}/api/retail/orders?limit=20`, {
  headers: { authorization: `Bearer ${adminToken.access_token}` }
});
const pendingApprovals = await request(`${apiBase}/api/admin/approvals?status=pending&limit=20`, {
  headers: { authorization: `Bearer ${adminToken.access_token}` }
});

const dealId = extractList(dealsResponse.body)[0]?.id ?? null;
const orderId = extractList(ordersResponse.body)[0]?.id ?? null;
const documentId = extractList(apiDocuments.body)[0]?.id ?? null;

async function findInvoiceContextId(kind, ids) {
  for (const id of ids) {
    const response = await request(`${apiBase}/api/platform/invoice-context/${kind}/${id}`, {
      headers: { authorization: `Bearer ${adminToken.access_token}` }
    });

    if (response.status === 200) {
      return id;
    }
  }

  return null;
}

const invoiceContextOrderId = await findInvoiceContextId(
  'order',
  extractList(ordersResponse.body)
    .map((entry) => entry?.id)
    .filter(Boolean)
);
let invoiceContextDealId = await findInvoiceContextId(
  'deal',
  extractList(dealsResponse.body)
    .map((entry) => entry?.id)
    .filter(Boolean)
);

if (!invoiceContextDealId) {
  const pendingWholesaleQuoteApproval = extractList(pendingApprovals.body).find(
    (approval) => approval?.approvalType === 'wholesale.quote.accept'
  );

  if (pendingWholesaleQuoteApproval?.id) {
    await request(`${apiBase}/api/admin/approvals/${pendingWholesaleQuoteApproval.id}/approve`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${adminToken.access_token}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ comment: 'Compliance smoke approval to verify B2B PDF context.' })
    });

    dealsResponse = await request(`${apiBase}/api/wholesale/deals?limit=20`, {
      headers: { authorization: `Bearer ${adminToken.access_token}` }
    });

    const refreshedDealId = await findInvoiceContextId(
      'deal',
      extractList(dealsResponse.body)
        .map((entry) => entry?.id)
        .filter(Boolean)
    );

    if (refreshedDealId) {
      invoiceContextDealId = refreshedDealId;
    }
  }

  if (!invoiceContextDealId) {
    const [tenantsResponse, buyerProfilesResponse, sellerProfilesResponse] = await Promise.all([
      request(`${apiBase}/api/tenants`, { headers: { authorization: `Bearer ${adminToken.access_token}` } }),
      request(`${apiBase}/api/catalog/buyer-profiles`, { headers: { authorization: `Bearer ${adminToken.access_token}` } }),
      request(`${apiBase}/api/catalog/seller-profiles`, { headers: { authorization: `Bearer ${adminToken.access_token}` } })
    ]);

    const tenantId = extractList(tenantsResponse.body)[0]?.id ?? null;
    const buyerProfileId = extractList(buyerProfilesResponse.body)[0]?.id ?? null;
    const sellerProfileId = extractList(sellerProfilesResponse.body)[0]?.id ?? null;

    if (tenantId && buyerProfileId && sellerProfileId) {
      const createdRfq = await request(`${apiBase}/api/wholesale/rfqs`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${adminToken.access_token}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          tenantId,
          buyerProfileId,
          title: 'Compliance smoke RFQ',
          description: 'Auto-generated RFQ for PDF verification.',
          currency: 'USD'
        })
      });

      const rfqId = createdRfq.body?.id ?? null;

      if (rfqId) {
        const createdQuote = await request(`${apiBase}/api/wholesale/rfqs/${rfqId}/quotes`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${adminToken.access_token}`,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            sellerProfileId,
            amountMinor: 12500,
            currency: 'USD',
            message: 'Compliance smoke quote'
          })
        });

        const quoteId = createdQuote.body?.id ?? null;

        if (quoteId) {
          const acceptedQuote = await request(`${apiBase}/api/wholesale/quotes/${quoteId}/accept`, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${adminToken.access_token}`,
              'content-type': 'application/json'
            },
            body: JSON.stringify({})
          });

          if (acceptedQuote.body?.status === 'pending_approval' && acceptedQuote.body?.approval?.id) {
            await request(`${apiBase}/api/admin/approvals/${acceptedQuote.body.approval.id}/approve`, {
              method: 'POST',
              headers: {
                authorization: `Bearer ${adminToken.access_token}`,
                'content-type': 'application/json'
              },
              body: JSON.stringify({ comment: 'Compliance smoke wholesale approval.' })
            });
          }

          dealsResponse = await request(`${apiBase}/api/wholesale/deals?limit=20`, {
            headers: { authorization: `Bearer ${adminToken.access_token}` }
          });
          invoiceContextDealId = await findInvoiceContextId(
            'deal',
            extractList(dealsResponse.body)
              .map((entry) => entry?.id)
              .filter(Boolean)
          );
        }
      }
    }

    if (!invoiceContextDealId) {
      const rfqsResponse = await request(`${apiBase}/api/wholesale/rfqs?limit=20`, {
        headers: { authorization: `Bearer ${adminToken.access_token}` }
      });
      const rfqRecord = extractList(rfqsResponse.body).find((rfq) => rfq?.id);
      const rfqId = rfqRecord?.id ?? null;
      const existingQuoteId = Array.isArray(rfqRecord?.quotes) ? rfqRecord.quotes[0]?.id ?? null : null;
      let quoteId = existingQuoteId;

      if (rfqId && !quoteId && sellerProfileId) {
        const createdQuote = await request(`${apiBase}/api/wholesale/rfqs/${rfqId}/quotes`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${adminToken.access_token}`,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            sellerProfileId,
            amountMinor: 12500,
            currency: 'USD',
            message: 'Compliance smoke quote'
          })
        });

        quoteId = createdQuote.body?.id ?? null;
      }

      if (quoteId) {
        const acceptedQuote = await request(`${apiBase}/api/wholesale/quotes/${quoteId}/accept`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${adminToken.access_token}`,
            'content-type': 'application/json'
          },
          body: JSON.stringify({})
        });

        if (acceptedQuote.body?.status === 'pending_approval' && acceptedQuote.body?.approval?.id) {
          await request(`${apiBase}/api/admin/approvals/${acceptedQuote.body.approval.id}/approve`, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${adminToken.access_token}`,
              'content-type': 'application/json'
            },
            body: JSON.stringify({ comment: 'Compliance smoke wholesale approval.' })
          });
        }

        dealsResponse = await request(`${apiBase}/api/wholesale/deals?limit=20`, {
          headers: { authorization: `Bearer ${adminToken.access_token}` }
        });
        invoiceContextDealId = await findInvoiceContextId(
          'deal',
          extractList(dealsResponse.body)
            .map((entry) => entry?.id)
            .filter(Boolean)
        );
      }
    }
  }
}

const invoicePdf = invoiceContextOrderId
  ? await request(`${webBase}/invoice/${invoiceContextOrderId}/pdf`, { headers: { cookie: webCookies } })
  : null;
const dealPdf = invoiceContextDealId
  ? await request(`${webBase}/deals/${invoiceContextDealId}/pdf`, { headers: { cookie: complianceCookies } })
  : null;
const escrowPdf = invoiceContextDealId
  ? await request(`${webBase}/deals/${invoiceContextDealId}/escrow-pdf`, { headers: { cookie: complianceCookies } })
  : null;

const summary = {
  apiBuyerNotifications: {
    status: apiBuyerNotifications.status,
    count: extractList(apiBuyerNotifications.body).length
  },
  webBuyerNotifications: {
    status: webBuyerNotifications.status,
    count: extractList(webBuyerNotifications.body).length
  },
  apiAudit: {
    status: apiAudit.status,
    count: extractList(apiAudit.body).length
  },
  apiDocuments: {
    status: apiDocuments.status,
    count: extractList(apiDocuments.body).length
  },
  adminHome: {
    status: adminHome.status,
    includesNotifications: typeof adminHome.body === 'string' ? adminHome.body.includes('Notifications') : false,
    includesAuditTrail: typeof adminHome.body === 'string' ? adminHome.body.includes('Audit Trail') : false
  },
  invoicePdf,
  dealPdf,
  escrowPdf,
  dealId,
  orderId,
  documentId,
  invoiceContextOrderId,
  invoiceContextDealId,
  errors: []
};

if (apiBuyerNotifications.status !== 200) summary.errors.push(`apiBuyerNotifications=${apiBuyerNotifications.status}`);
if (webBuyerNotifications.status !== 200) summary.errors.push(`webBuyerNotifications=${webBuyerNotifications.status}`);
if (extractList(apiBuyerNotifications.body).length === 0) summary.errors.push('buyerNotificationsEmpty');
if (apiAudit.status !== 200) summary.errors.push(`apiAudit=${apiAudit.status}`);
if (apiDocuments.status !== 200) summary.errors.push(`apiDocuments=${apiDocuments.status}`);
if (adminHome.status !== 200) summary.errors.push(`adminHome=${adminHome.status}`);
if (!summary.adminHome.includesNotifications || !summary.adminHome.includesAuditTrail) {
  summary.errors.push('adminHomeMissingSections');
}
if (!dealId) summary.errors.push('missingDealId');
if (!orderId) summary.errors.push('missingOrderId');
if (!invoiceContextOrderId) summary.errors.push('missingInvoiceContextOrder');
if (!invoiceContextDealId) summary.errors.push('missingInvoiceContextDeal');
if (invoicePdf && (invoicePdf.status !== 200 || invoicePdf.bytes <= 0)) summary.errors.push('invoicePdf');
if (dealPdf && (dealPdf.status !== 200 || dealPdf.bytes <= 0)) summary.errors.push('dealPdf');
if (escrowPdf && (escrowPdf.status !== 200 || escrowPdf.bytes <= 0)) summary.errors.push('escrowPdf');

console.log(JSON.stringify(summary, null, 2));

if (summary.errors.length) {
  process.exitCode = 1;
}
