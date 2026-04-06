'use server';

import { revalidatePath } from 'next/cache';
import { requireAccessToken } from '../lib/auth';

const internalBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

async function sendJson(path: string, method: 'POST' | 'PUT', payload: Record<string, unknown>) {
  const accessToken = await requireAccessToken('/');
  const response = await fetch(`${internalBaseUrl}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}`);
  }

  await response.json();
  revalidatePath('/');
}

export async function approveApprovalAction(formData: FormData) {
  const approvalId = String(formData.get('approvalId') ?? '');
  const comment = String(formData.get('comment') ?? '').trim();

  await sendJson(`/api/admin/approvals/${approvalId}/approve`, 'POST', {
    comment: comment || undefined
  });
}

export async function rejectApprovalAction(formData: FormData) {
  const approvalId = String(formData.get('approvalId') ?? '');
  const comment = String(formData.get('comment') ?? '').trim();

  await sendJson(`/api/admin/approvals/${approvalId}/reject`, 'POST', {
    comment: comment || undefined
  });
}

export async function createOrgUnitAction(formData: FormData) {
  const tenantId = String(formData.get('tenantId') ?? '');
  const organizationId = String(formData.get('organizationId') ?? '');
  const parentId = String(formData.get('parentId') ?? '').trim();
  const name = String(formData.get('name') ?? '');
  const code = String(formData.get('code') ?? '').trim();

  await sendJson(`/api/tenants/${tenantId}/org-units`, 'POST', {
    organizationId,
    parentId: parentId || undefined,
    name,
    code: code || undefined
  });
}

export async function createMembershipAction(formData: FormData) {
  const tenantId = String(formData.get('tenantId') ?? '');
  const userId = String(formData.get('userId') ?? '');
  const organizationId = String(formData.get('organizationId') ?? '').trim();
  const orgUnitId = String(formData.get('orgUnitId') ?? '').trim();
  const membershipType = String(formData.get('membershipType') ?? 'member');
  const status = String(formData.get('status') ?? 'active');

  await sendJson(`/api/tenants/${tenantId}/memberships`, 'POST', {
    userId,
    organizationId: organizationId || undefined,
    orgUnitId: orgUnitId || undefined,
    membershipType,
    status
  });
}

export async function assignRolesAction(formData: FormData) {
  const userId = String(formData.get('userId') ?? '');
  const roleIds = formData
    .getAll('roleIds')
    .map((value) => String(value))
    .filter((value) => value.length > 0);

  await sendJson(`/api/identity/users/${userId}/roles`, 'PUT', {
    roleIds
  });
}

export async function createCategoryAction(formData: FormData) {
  const parentId = String(formData.get('parentId') ?? '').trim();
  const slug = String(formData.get('slug') ?? '');
  const name = String(formData.get('name') ?? '');
  const description = String(formData.get('description') ?? '').trim();

  await sendJson('/api/catalog/categories', 'POST', {
    parentId: parentId || undefined,
    slug,
    name,
    description: description || undefined
  });
}

export async function createSellerProfileAction(formData: FormData) {
  const userId = String(formData.get('userId') ?? '').trim();
  const tenantId = String(formData.get('tenantId') ?? '').trim();
  const sellerType = String(formData.get('sellerType') ?? 'business');
  const displayName = String(formData.get('displayName') ?? '');

  await sendJson('/api/catalog/seller-profiles', 'POST', {
    userId: userId || undefined,
    tenantId: tenantId || undefined,
    sellerType,
    displayName
  });
}

export async function createProductAction(formData: FormData) {
  const sellerProfileId = String(formData.get('sellerProfileId') ?? '');
  const categoryId = String(formData.get('categoryId') ?? '');
  const slug = String(formData.get('slug') ?? '');
  const sku = String(formData.get('sku') ?? '');
  const name = String(formData.get('name') ?? '');
  const description = String(formData.get('description') ?? '').trim();
  const status = String(formData.get('status') ?? 'draft');
  const targetMarket = String(formData.get('targetMarket') ?? 'both');
  const currency = String(formData.get('currency') ?? 'USD');
  const amountMinor = Number(formData.get('amountMinor') ?? 0);

  await sendJson('/api/catalog/products', 'POST', {
    sellerProfileId,
    categoryId,
    slug,
    sku,
    name,
    description: description || undefined,
    status,
    targetMarket,
    currency,
    amountMinor
  });
}

export async function createRetailOrderAction(formData: FormData) {
  const buyerProfileId = String(formData.get('buyerProfileId') ?? '');
  const productId = String(formData.get('productId') ?? '');
  const quantity = Number(formData.get('quantity') ?? 1);

  await sendJson('/api/retail/orders', 'POST', {
    buyerProfileId,
    items: [
      {
        productId,
        quantity
      }
    ]
  });
}

export async function updateRetailOrderStatusAction(formData: FormData) {
  const orderId = String(formData.get('orderId') ?? '');
  const status = String(formData.get('status') ?? 'paid');

  await sendJson(`/api/retail/orders/${orderId}/status`, 'PUT', {
    status
  });
}

export async function createWholesaleRfqAction(formData: FormData) {
  const tenantId = String(formData.get('tenantId') ?? '');
  const buyerProfileId = String(formData.get('buyerProfileId') ?? '');
  const requestedByUserId = String(formData.get('requestedByUserId') ?? '').trim();
  const title = String(formData.get('title') ?? '');
  const description = String(formData.get('description') ?? '').trim();
  const currency = String(formData.get('currency') ?? 'USD');

  await sendJson('/api/wholesale/rfqs', 'POST', {
    tenantId,
    buyerProfileId,
    requestedByUserId: requestedByUserId || undefined,
    title,
    description: description || undefined,
    currency
  });
}

export async function submitWholesaleQuoteAction(formData: FormData) {
  const rfqId = String(formData.get('rfqId') ?? '');
  const sellerProfileId = String(formData.get('sellerProfileId') ?? '');
  const amountMinor = Number(formData.get('amountMinor') ?? 0);
  const currency = String(formData.get('currency') ?? 'USD');
  const message = String(formData.get('message') ?? '').trim();

  await sendJson(`/api/wholesale/rfqs/${rfqId}/quotes`, 'POST', {
    sellerProfileId,
    amountMinor,
    currency,
    message: message || undefined
  });
}

export async function acceptWholesaleQuoteAction(formData: FormData) {
  const quoteId = String(formData.get('quoteId') ?? '');
  const contractId = String(formData.get('contractId') ?? '').trim();

  await sendJson(`/api/wholesale/quotes/${quoteId}/accept`, 'POST', {
    contractId: contractId || undefined
  });
}

export async function createContractAction(formData: FormData) {
  const dealId = String(formData.get('dealId') ?? '');
  const contractType = String(formData.get('contractType') ?? 'master_purchase');
  const title = String(formData.get('title') ?? '');

  await sendJson('/api/contracts', 'POST', {
    dealId,
    contractType,
    title
  });
}

export async function createContractVersionAction(formData: FormData) {
  const contractId = String(formData.get('contractId') ?? '');
  const label = String(formData.get('label') ?? '').trim();
  const storageBucket = String(formData.get('storageBucket') ?? '').trim();
  const storageKey = String(formData.get('storageKey') ?? '').trim();
  const createdByUserId = String(formData.get('createdByUserId') ?? '').trim();

  await sendJson(`/api/contracts/${contractId}/versions`, 'POST', {
    label: label || undefined,
    storageBucket: storageBucket || undefined,
    storageKey: storageKey || undefined,
    createdByUserId: createdByUserId || undefined
  });
}

export async function createDocumentAction(formData: FormData) {
  const tenantId = String(formData.get('tenantId') ?? '').trim();
  const uploadedByUserId = String(formData.get('uploadedByUserId') ?? '').trim();
  const documentType = String(formData.get('documentType') ?? 'attachment');
  const name = String(formData.get('name') ?? '');
  const contentType = String(formData.get('contentType') ?? '').trim();
  const storageBucket = String(formData.get('storageBucket') ?? '').trim();
  const storageKey = String(formData.get('storageKey') ?? '').trim();

  await sendJson('/api/documents', 'POST', {
    tenantId: tenantId || undefined,
    uploadedByUserId: uploadedByUserId || undefined,
    documentType,
    name,
    contentType: contentType || undefined,
    storageBucket: storageBucket || undefined,
    storageKey: storageKey || undefined
  });
}

export async function createDocumentLinkAction(formData: FormData) {
  const documentId = String(formData.get('documentId') ?? '');
  const dealId = String(formData.get('dealId') ?? '').trim();
  const contractId = String(formData.get('contractId') ?? '').trim();
  const linkType = String(formData.get('linkType') ?? 'deal_attachment');

  await sendJson(`/api/documents/${documentId}/links`, 'POST', {
    dealId: dealId || undefined,
    contractId: contractId || undefined,
    linkType
  });
}

export async function updateDocumentStatusAction(formData: FormData) {
  const documentId = String(formData.get('documentId') ?? '');
  const status = String(formData.get('status') ?? 'approved');

  await sendJson(`/api/documents/${documentId}/status`, 'PUT', {
    status
  });
}

export async function createPaymentTransactionAction(formData: FormData) {
  const dealId = String(formData.get('dealId') ?? '');
  const currency = String(formData.get('currency') ?? 'USD');
  const totalAmountMinor = Number(formData.get('totalAmountMinor') ?? 0);

  await sendJson('/api/payments/transactions', 'POST', {
    dealId,
    currency,
    totalAmountMinor
  });
}

export async function holdPaymentAction(formData: FormData) {
  const paymentTransactionId = String(formData.get('paymentTransactionId') ?? '');
  await sendJson(`/api/payments/transactions/${paymentTransactionId}/hold`, 'POST', {});
}

export async function releasePaymentAction(formData: FormData) {
  const paymentTransactionId = String(formData.get('paymentTransactionId') ?? '');
  const amountMinor = Number(formData.get('amountMinor') ?? 0);
  const note = String(formData.get('note') ?? '').trim();

  await sendJson(`/api/payments/transactions/${paymentTransactionId}/release`, 'POST', {
    amountMinor,
    note: note || undefined
  });
}

export async function refundPaymentAction(formData: FormData) {
  const paymentTransactionId = String(formData.get('paymentTransactionId') ?? '');
  const amountMinor = Number(formData.get('amountMinor') ?? 0);
  const note = String(formData.get('note') ?? '').trim();

  await sendJson(`/api/payments/transactions/${paymentTransactionId}/refund`, 'POST', {
    amountMinor,
    note: note || undefined
  });
}

export async function createDisputeAction(formData: FormData) {
  const dealId = String(formData.get('dealId') ?? '').trim();
  const paymentTransactionId = String(formData.get('paymentTransactionId') ?? '').trim();
  const disputeType = String(formData.get('disputeType') ?? 'payment');
  const reason = String(formData.get('reason') ?? '');

  await sendJson('/api/disputes', 'POST', {
    dealId: dealId || undefined,
    paymentTransactionId: paymentTransactionId || undefined,
    disputeType,
    reason
  });
}

export async function createLogisticsProviderAction(formData: FormData) {
  const name = String(formData.get('name') ?? '');
  const contactEmail = String(formData.get('contactEmail') ?? '').trim();

  await sendJson('/api/logistics/providers', 'POST', {
    name,
    contactEmail: contactEmail || undefined
  });
}

export async function updateLogisticsProviderStatusAction(formData: FormData) {
  const providerId = String(formData.get('providerId') ?? '');
  const status = String(formData.get('status') ?? 'active');

  await sendJson(`/api/logistics/providers/${providerId}/status`, 'PUT', {
    status
  });
}

export async function updateCapabilityProfileAction(formData: FormData) {
  const providerId = String(formData.get('providerId') ?? '');
  const transportTypes = String(formData.get('transportTypes') ?? '').trim();
  const serviceTypes = String(formData.get('serviceTypes') ?? '').trim();
  const cargoCategories = String(formData.get('cargoCategories') ?? '').trim();
  const supportedRegions = String(formData.get('supportedRegions') ?? '').trim();
  const deliveryModes = String(formData.get('deliveryModes') ?? '').trim();
  const additionalServices = String(formData.get('additionalServices') ?? '').trim();

  const toList = (value: string) =>
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

  await sendJson(`/api/logistics/providers/${providerId}/capability-profile`, 'PUT', {
    transportTypes: toList(transportTypes),
    serviceTypes: toList(serviceTypes),
    cargoCategories: toList(cargoCategories),
    supportedRegions: toList(supportedRegions),
    deliveryModes: toList(deliveryModes),
    additionalServices: toList(additionalServices)
  });
}

export async function selectLogisticsProviderAction(formData: FormData) {
  const dealId = String(formData.get('dealId') ?? '');
  const logisticsProviderId = String(formData.get('logisticsProviderId') ?? '');
  const notes = String(formData.get('notes') ?? '').trim();

  await sendJson(`/api/wholesale/deals/${dealId}/logistics-selection`, 'POST', {
    logisticsProviderId,
    notes: notes || undefined
  });
}
