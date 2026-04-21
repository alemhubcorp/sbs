'use server';

import { revalidatePath } from 'next/cache';
import { requireAccessToken } from '../lib/auth';

const internalBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

async function sendJson<T = unknown>(
  path: string,
  method: 'POST' | 'PUT',
  payload: Record<string, unknown>,
  revalidatePaths: string[] = ['/admin']
): Promise<T> {
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
    let reason = `Request to ${path} failed with status ${response.status}`;
    try {
      const errorBody = (await response.json()) as { error?: string; message?: string };
      reason = errorBody.error ?? errorBody.message ?? reason;
    } catch {
      // Keep fallback error text.
    }
    throw new Error(reason);
  }

  const data = (await response.json()) as T;
  for (const pathToRevalidate of revalidatePaths) {
    revalidatePath(pathToRevalidate);
  }

  return data;
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

export async function createPartnerAction(formData: FormData) {
  const tenantId = String(formData.get('tenantId') ?? '');
  const linkedUserId = String(formData.get('linkedUserId') ?? '').trim();
  const payload = {
    name: String(formData.get('name') ?? '').trim(),
    legalName: String(formData.get('legalName') ?? '').trim() || undefined,
    partnerType: String(formData.get('partnerType') ?? 'logistics_company'),
    status: String(formData.get('status') ?? 'active'),
    ...(linkedUserId ? { linkedUserId } : {}),
    contactName: String(formData.get('contactName') ?? '').trim() || undefined,
    contactEmail: String(formData.get('contactEmail') ?? '').trim() || undefined,
    contactPhone: String(formData.get('contactPhone') ?? '').trim() || undefined,
    address: String(formData.get('address') ?? '').trim() || undefined,
    country: String(formData.get('country') ?? '').trim() || undefined,
    notes: String(formData.get('notes') ?? '').trim() || undefined
  };

  await sendJson(`/api/tenants/${tenantId}/organizations`, 'POST', payload, ['/admin', '/admin/partners']);
}

export async function updatePartnerAction(formData: FormData) {
  const tenantId = String(formData.get('tenantId') ?? '');
  const organizationId = String(formData.get('organizationId') ?? '');
  const payload = {
    ...(String(formData.get('name') ?? '').trim() ? { name: String(formData.get('name') ?? '').trim() } : {}),
    ...(String(formData.get('legalName') ?? '').trim() ? { legalName: String(formData.get('legalName') ?? '').trim() } : {}),
    ...(String(formData.get('partnerType') ?? '').trim() ? { partnerType: String(formData.get('partnerType') ?? 'logistics_company') } : {}),
    ...(String(formData.get('status') ?? '').trim() ? { status: String(formData.get('status') ?? 'active') } : {}),
    ...(String(formData.get('linkedUserId') ?? '').trim() ? { linkedUserId: String(formData.get('linkedUserId') ?? '').trim() } : { linkedUserId: null }),
    ...(String(formData.get('contactName') ?? '').trim() ? { contactName: String(formData.get('contactName') ?? '').trim() } : {}),
    ...(String(formData.get('contactEmail') ?? '').trim() ? { contactEmail: String(formData.get('contactEmail') ?? '').trim() } : {}),
    ...(String(formData.get('contactPhone') ?? '').trim() ? { contactPhone: String(formData.get('contactPhone') ?? '').trim() } : {}),
    ...(String(formData.get('address') ?? '').trim() ? { address: String(formData.get('address') ?? '').trim() } : {}),
    ...(String(formData.get('country') ?? '').trim() ? { country: String(formData.get('country') ?? '').trim() } : {}),
    ...(String(formData.get('notes') ?? '').trim() ? { notes: String(formData.get('notes') ?? '').trim() } : {})
  };

  await sendJson(`/api/tenants/${tenantId}/organizations/${organizationId}`, 'PUT', payload, ['/admin', '/admin/partners']);
}

export async function togglePartnerStatusAction(formData: FormData) {
  const tenantId = String(formData.get('tenantId') ?? '');
  const organizationId = String(formData.get('organizationId') ?? '');
  const status = String(formData.get('status') ?? 'inactive');

  await sendJson(
    `/api/tenants/${tenantId}/organizations/${organizationId}`,
    'PUT',
    {
      name: String(formData.get('name') ?? '').trim(),
      legalName: String(formData.get('legalName') ?? '').trim() || undefined,
      partnerType: String(formData.get('partnerType') ?? 'logistics_company'),
      status,
      linkedUserId: String(formData.get('linkedUserId') ?? '').trim() || undefined,
      contactName: String(formData.get('contactName') ?? '').trim() || undefined,
      contactEmail: String(formData.get('contactEmail') ?? '').trim() || undefined,
      contactPhone: String(formData.get('contactPhone') ?? '').trim() || undefined,
      address: String(formData.get('address') ?? '').trim() || undefined,
      country: String(formData.get('country') ?? '').trim() || undefined,
      notes: String(formData.get('notes') ?? '').trim() || undefined
    },
    ['/admin', '/admin/partners']
  );
}

export async function createPartnerUserAction(formData: FormData) {
  const tenantId = String(formData.get('tenantId') ?? '');
  const organizationId = String(formData.get('organizationId') ?? '');
  const email = String(formData.get('email') ?? '').trim();
  const firstName = String(formData.get('firstName') ?? '').trim();
  const lastName = String(formData.get('lastName') ?? '').trim();
  const roleIds = formData
    .getAll('roleIds')
    .map((value) => String(value))
    .filter((value) => value.length > 0);

  const user = await sendJson<{ id: string }>(
    '/api/identity/users',
    'POST',
    {
      email,
      firstName,
      lastName,
      roleIds
    },
    ['/admin', '/admin/partners']
  );

  await sendJson(
    `/api/tenants/${tenantId}/organizations/${organizationId}`,
    'PUT',
    {
      linkedUserId: user.id
    },
    ['/admin', '/admin/partners']
  );

  await sendJson(
    `/api/tenants/${tenantId}/memberships`,
    'POST',
    {
      userId: user.id,
      organizationId,
      membershipType: 'admin',
      status: 'active'
    },
    ['/admin', '/admin/partners']
  );
}

export async function linkExistingPartnerUserAction(formData: FormData) {
  const tenantId = String(formData.get('tenantId') ?? '');
  const organizationId = String(formData.get('organizationId') ?? '');
  const userId = String(formData.get('userId') ?? '').trim();
  const roleId = String(formData.get('roleId') ?? '').trim();

  await sendJson(
    `/api/tenants/${tenantId}/organizations/${organizationId}`,
    'PUT',
    {
      linkedUserId: userId || null
    },
    ['/admin', '/admin/partners']
  );

  if (roleId) {
    await sendJson(
      `/api/identity/users/${userId}/roles`,
      'PUT',
      {
        roleIds: [roleId]
      },
      ['/admin', '/admin/partners']
    );
  }

  await sendJson(
    `/api/tenants/${tenantId}/memberships`,
    'POST',
    {
      userId,
      organizationId,
      membershipType: 'admin',
      status: 'active'
    },
    ['/admin', '/admin/partners']
  );
}

export async function createAssignmentAction(formData: FormData) {
  const payload = {
    tenantId: String(formData.get('tenantId') ?? ''),
    kind: String(formData.get('kind') ?? 'shipment'),
    subjectType: String(formData.get('subjectType') ?? '').trim(),
    subjectId: String(formData.get('subjectId') ?? '').trim(),
    partnerOrganizationId: String(formData.get('partnerOrganizationId') ?? '').trim() || undefined,
    partnerUserId: String(formData.get('partnerUserId') ?? '').trim() || undefined,
    reference: String(formData.get('reference') ?? '').trim() || undefined,
    status: String(formData.get('status') ?? '').trim() || undefined,
    notes: String(formData.get('notes') ?? '').trim() || undefined
  };

  await sendJson('/api/partner-ops/assignments', 'POST', payload, ['/admin', '/admin/partners']);
}

export async function updateAssignmentAction(formData: FormData) {
  const assignmentId = String(formData.get('assignmentId') ?? '');
  const payload = {
    partnerOrganizationId: String(formData.get('partnerOrganizationId') ?? '').trim() || null,
    partnerUserId: String(formData.get('partnerUserId') ?? '').trim() || null,
    reference: String(formData.get('reference') ?? '').trim() || null,
    status: String(formData.get('status') ?? '').trim() || undefined,
    notes: String(formData.get('notes') ?? '').trim() || null
  };

  await sendJson(`/api/partner-ops/assignments/${assignmentId}`, 'PUT', payload, ['/admin', '/admin/partners']);
}

export async function updateEmailSettingsAction(_prevStateOrFormData: unknown, maybeFormData?: FormData) {
  const formData = maybeFormData ?? (_prevStateOrFormData as FormData);
  const smtpPassword = String(formData.get('smtpPassword') ?? '').trim();

  const payload = {
    section: 'email',
    value: {
      enabled: String(formData.get('enabled') ?? 'off') === 'on',
      provider: 'smtp',
      smtpHost: String(formData.get('smtpHost') ?? '').trim(),
      smtpPort: Number(formData.get('smtpPort') ?? 587),
      smtpUser: String(formData.get('smtpUser') ?? '').trim(),
      ...(smtpPassword ? { smtpPassword } : {}),
      smtpSecure: String(formData.get('smtpSecure') ?? 'off') === 'on',
      fromName: String(formData.get('fromName') ?? '').trim(),
      fromEmail: String(formData.get('fromEmail') ?? '').trim(),
      replyToEmail: String(formData.get('replyToEmail') ?? '').trim(),
      supportEmail: String(formData.get('supportEmail') ?? '').trim(),
      supportPhone: String(formData.get('supportPhone') ?? '').trim(),
      notes: String(formData.get('notes') ?? '').trim()
    }
  };

  try {
    await sendJson('/api/admin/settings/email:default', 'PUT', payload, ['/admin', '/admin/settings/smtp']);
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to save SMTP settings.' };
  }
}

export async function testEmailConfigurationAction(_prevStateOrFormData: unknown, maybeFormData?: FormData) {
  const formData = maybeFormData ?? (_prevStateOrFormData as FormData);
  const recipientEmail = String(formData.get('recipientEmail') ?? '').trim();

  try {
    const result = await sendJson<{
      success: boolean;
      error: string | null;
      transport: string;
      recipientEmail: string;
      details: unknown;
    }>(
      '/api/admin/settings/email/test',
      'POST',
      {
        recipientEmail,
        subject: String(formData.get('subject') ?? 'RuFlo SMTP test'),
        message: String(formData.get('message') ?? 'This is a test message from the RuFlo admin settings page.')
      },
      ['/admin', '/admin/settings/smtp']
    );

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test SMTP configuration.',
      transport: 'smtp',
      recipientEmail,
      details: null
    };
  }
}

function collectIndexedRecords(
  formData: FormData,
  prefix: string,
  fields: string[],
  count: number
) {
  const records: Array<Record<string, string | boolean | number>> = Array.from({ length: count }, (_, index) => {
    const record: Record<string, string> = {};
    for (const field of fields) {
      record[field] = String(formData.get(`${prefix}_${field}_${index}`) ?? '').trim();
    }

    return {
      ...record,
      active: String(formData.get(`${prefix}_active_${index}`) ?? 'off') === 'on',
      displayOrder: Number(formData.get(`${prefix}_displayOrder_${index}`) ?? index + 1)
    };
  });

  return records.filter((record) => fields.some((field) => typeof record[field] === 'string' && String(record[field]).length > 0));
}

export async function updateGovernanceSettingsAction(formData: FormData) {
  await sendJson(
    '/api/admin/settings/governance:auth',
    'PUT',
    {
      section: 'governance',
      value: {
        emailVerificationRequired: String(formData.get('emailVerificationRequired') ?? 'off') === 'on'
      }
    },
    ['/admin/settings/platform']
  );
}

export async function updateAiContentSettingsAction(formData: FormData) {
  const languages = String(formData.get('translationLanguages') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  await sendJson(
    '/api/admin/settings/ai:content-assistant',
    'PUT',
    {
      section: 'ai',
      value: {
        enabled: String(formData.get('enabled') ?? 'off') === 'on',
        provider: String(formData.get('provider') ?? 'openai').trim(),
        model: String(formData.get('model') ?? '').trim(),
        apiBaseUrl: String(formData.get('apiBaseUrl') ?? '').trim(),
        apiKey: String(formData.get('apiKey') ?? '').trim() || undefined,
        translationLanguages: languages,
        notes: String(formData.get('notes') ?? '').trim()
      }
    },
    ['/admin/settings/platform']
  );
}

export async function updateSocialLinksSettingsAction(formData: FormData) {
  const items = collectIndexedRecords(formData, 'social', ['id', 'name', 'url', 'icon', 'logoUrl'], 6);

  await sendJson(
    '/api/admin/settings/public:social-links',
    'PUT',
    {
      section: 'public',
      value: {
        items
      }
    },
    ['/admin/settings/platform']
  );
}

export async function updateContactSettingsAction(formData: FormData) {
  const addresses = collectIndexedRecords(formData, 'address', ['id', 'label', 'value'], 6);
  const phones = collectIndexedRecords(formData, 'phone', ['id', 'label', 'value'], 6);

  await sendJson(
    '/api/admin/settings/public:contact-settings',
    'PUT',
    {
      section: 'public',
      value: {
        addresses,
        phones
      }
    },
    ['/admin/settings/platform']
  );
}

export async function updateLegalDocumentsAction(formData: FormData) {
  const documents = ['terms', 'returns', 'support-policy', 'privacy', 'seller-policy'].map((slug) => ({
    slug,
    title: String(formData.get(`${slug}_title`) ?? '').trim(),
    footerLabel: String(formData.get(`${slug}_footerLabel`) ?? '').trim(),
    summary: String(formData.get(`${slug}_summary`) ?? '').trim(),
    content: String(formData.get(`${slug}_content`) ?? '').trim(),
    version: String(formData.get(`${slug}_version`) ?? '').trim(),
    active: String(formData.get(`${slug}_active`) ?? 'off') === 'on',
    showInFooter: String(formData.get(`${slug}_showInFooter`) ?? 'off') === 'on'
  }));

  await sendJson(
    '/api/admin/settings/legal:documents',
    'PUT',
    {
      section: 'legal',
      value: {
        documents
      }
    },
    ['/admin/settings/legal']
  );
}

export async function createManagedAccountAction(formData: FormData) {
  const roleIds = formData
    .getAll('roleIds')
    .map((value) => String(value))
    .filter((value) => value.length > 0);

  await sendJson(
    '/api/identity/accounts',
    'POST',
    {
      email: String(formData.get('email') ?? '').trim(),
      firstName: String(formData.get('firstName') ?? '').trim(),
      lastName: String(formData.get('lastName') ?? '').trim(),
      password: String(formData.get('password') ?? ''),
      status: String(formData.get('status') ?? 'active'),
      accountType: String(formData.get('accountType') ?? 'user'),
      roleIds
    },
    ['/admin/users']
  );
}

export async function updateManagedUserStatusAction(formData: FormData) {
  const userId = String(formData.get('userId') ?? '');
  const status = String(formData.get('status') ?? 'disabled');

  await sendJson(
    `/api/identity/users/${userId}/status`,
    'PUT',
    {
      status
    },
    ['/admin/users']
  );
}
