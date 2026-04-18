import { requireAccessToken } from './auth';

const internalBaseUrl = process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export interface AdminDashboardData {
  authContext: unknown | null;
  health: unknown | null;
  approvals: unknown[];
  tenants: unknown[];
  users: unknown[];
  roles: unknown[];
  orgUnits: unknown[];
  memberships: unknown[];
  categories: unknown[];
  products: unknown[];
  sellerProfiles: unknown[];
  buyerProfiles: unknown[];
  retailOrders: unknown[];
  wholesaleRfqs: unknown[];
  wholesaleDeals: unknown[];
  wholesaleDealDetails: unknown[];
  contracts: unknown[];
  documents: unknown[];
  notifications: unknown[];
  auditEvents: unknown[];
  paymentTransactions: unknown[];
  disputes: unknown[];
  logisticsProviders: unknown[];
  logisticsSelections: unknown[];
  emailSetting: unknown | null;
}

async function fetchJson<T>(path: string, accessToken: string): Promise<T> {
  const authenticatedResponse = await fetch(`${internalBaseUrl}${path}`, {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!authenticatedResponse.ok) {
    throw new Error(`Request to ${path} failed with status ${authenticatedResponse.status}`);
  }

  return authenticatedResponse.json() as Promise<T>;
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const accessToken = await requireAccessToken('/');
  const [health, authContext, approvals, tenants, users, roles, categories, products, sellerProfiles, buyerProfiles, retailOrders] =
    await Promise.allSettled([
    fetchJson('/api/health', accessToken),
    fetchJson('/api/identity/context', accessToken),
    fetchJson<unknown[]>('/api/admin/approvals?status=pending&limit=20', accessToken),
    fetchJson<unknown[]>('/api/tenants', accessToken),
    fetchJson<unknown[]>('/api/identity/users', accessToken),
    fetchJson<unknown[]>('/api/identity/roles', accessToken),
    fetchJson<unknown[]>('/api/catalog/categories', accessToken),
    fetchJson<unknown[]>('/api/catalog/products', accessToken),
    fetchJson<unknown[]>('/api/catalog/seller-profiles', accessToken),
    fetchJson<unknown[]>('/api/catalog/buyer-profiles', accessToken),
    fetchJson<unknown[]>('/api/retail/orders', accessToken)
  ]);

  const [wholesaleRfqs, wholesaleDeals, contracts, documents, notifications, auditEvents, paymentTransactions, disputes, logisticsProviders] = await Promise.allSettled([
    fetchJson<unknown[]>('/api/wholesale/rfqs', accessToken),
    fetchJson<unknown[]>('/api/wholesale/deals', accessToken),
    fetchJson<unknown[]>('/api/contracts', accessToken),
    fetchJson<unknown[]>('/api/documents', accessToken),
    fetchJson<unknown[]>('/api/notifications?limit=20', accessToken),
    fetchJson<unknown[]>('/api/audit/events?limit=20', accessToken),
    fetchJson<unknown[]>('/api/payments/transactions', accessToken),
    fetchJson<unknown[]>('/api/disputes', accessToken),
    fetchJson<unknown[]>('/api/logistics/providers', accessToken)
  ]);

  const emailSetting = await Promise.allSettled([fetchJson<unknown>('/api/admin/settings/email:default', accessToken)]);

  const dealRecords = wholesaleDeals.status === 'fulfilled' ? wholesaleDeals.value : [];
  const dealIds = dealRecords
    .map((deal) => {
      const id = (deal as { id?: string }).id;
      return typeof id === 'string' ? id : null;
    })
    .filter((dealId): dealId is string => Boolean(dealId))
    .slice(0, 5);

  const dealDetailResults = await Promise.allSettled(
    dealIds.map((dealId) => fetchJson<unknown>(`/api/wholesale/deals/${dealId}`, accessToken))
  );
  const logisticsSelectionResults = await Promise.allSettled(
    dealIds.map((dealId) => fetchJson<unknown>(`/api/wholesale/deals/${dealId}/logistics-selection`, accessToken))
  );

  const tenantRecords = tenants.status === 'fulfilled' ? tenants.value : [];
  const tenantIds = tenantRecords
    .map((tenant) => {
      const id = (tenant as { id?: string }).id;
      return typeof id === 'string' ? id : null;
    })
    .filter((tenantId): tenantId is string => Boolean(tenantId));

  const orgUnitResults = await Promise.allSettled(
    tenantIds.map((tenantId) => fetchJson<unknown[]>(`/api/tenants/${tenantId}/org-units`, accessToken))
  );
  const membershipResults = await Promise.allSettled(
    tenantIds.map((tenantId) => fetchJson<unknown[]>(`/api/tenants/${tenantId}/memberships`, accessToken))
  );

  return {
    health: health.status === 'fulfilled' ? health.value : null,
    authContext: authContext.status === 'fulfilled' ? authContext.value : null,
    approvals: approvals.status === 'fulfilled' ? approvals.value : [],
    tenants: tenantRecords,
    users: users.status === 'fulfilled' ? users.value : [],
    roles: roles.status === 'fulfilled' ? roles.value : [],
    orgUnits: orgUnitResults.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])),
    memberships: membershipResults.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])),
    categories: categories.status === 'fulfilled' ? categories.value : [],
    products: products.status === 'fulfilled' ? products.value : [],
    sellerProfiles: sellerProfiles.status === 'fulfilled' ? sellerProfiles.value : [],
    buyerProfiles: buyerProfiles.status === 'fulfilled' ? buyerProfiles.value : [],
    retailOrders: retailOrders.status === 'fulfilled' ? retailOrders.value : [],
    wholesaleRfqs: wholesaleRfqs.status === 'fulfilled' ? wholesaleRfqs.value : [],
    wholesaleDeals: dealRecords,
    wholesaleDealDetails: dealDetailResults.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : [])),
    contracts: contracts.status === 'fulfilled' ? contracts.value : [],
    documents: documents.status === 'fulfilled' ? documents.value : [],
    notifications:
      notifications.status === 'fulfilled' && notifications.value && typeof notifications.value === 'object'
        ? Array.isArray((notifications.value as unknown as { items?: unknown[] }).items)
          ? (notifications.value as unknown as { items: unknown[] }).items
          : []
        : [],
    auditEvents: auditEvents.status === 'fulfilled' ? auditEvents.value : [],
    paymentTransactions: paymentTransactions.status === 'fulfilled' ? paymentTransactions.value : [],
    disputes: disputes.status === 'fulfilled' ? disputes.value : [],
    logisticsProviders: logisticsProviders.status === 'fulfilled' ? logisticsProviders.value : [],
    logisticsSelections: logisticsSelectionResults.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : [])),
    emailSetting: emailSetting[0].status === 'fulfilled' ? emailSetting[0].value : null
  };
}
