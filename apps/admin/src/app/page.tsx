import {
  approveApprovalAction,
  assignRolesAction,
  createCategoryAction,
  createMembershipAction,
  createOrgUnitAction,
  createProductAction,
  createContractAction,
  createContractVersionAction,
  createDocumentAction,
  createDocumentLinkAction,
  createDisputeAction,
  createLogisticsProviderAction,
  createPaymentTransactionAction,
  createWholesaleRfqAction,
  createRetailOrderAction,
  createSellerProfileAction,
  holdPaymentAction,
  refundPaymentAction,
  rejectApprovalAction,
  releasePaymentAction,
  selectLogisticsProviderAction,
  submitWholesaleQuoteAction,
  acceptWholesaleQuoteAction,
  updateCapabilityProfileAction,
  updateDocumentStatusAction,
  updateLogisticsProviderStatusAction,
  updateRetailOrderStatusAction
} from './actions';
import { getAdminDashboardData } from '../lib/api';

export const dynamic = 'force-dynamic';

export default async function AdminHomePage() {
  const keycloakRealm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM ?? 'ruflo';
  const dashboard = await getAdminDashboardData();
  const authContext = (dashboard.authContext ?? null) as {
    email?: string | null;
    username?: string | null;
    roles?: string[];
    permissions?: string[];
    tenantId?: string | null;
  } | null;
  const approvals = dashboard.approvals as Array<{
    id?: string;
    status?: string;
    module?: string;
    approvalType?: string;
    subjectType?: string;
    subjectId?: string;
    reason?: string | null;
    createdAt?: string;
  }>;
  const tenantOptions = dashboard.tenants as Array<{
    id?: string;
    name?: string;
    organizations?: Array<{ id?: string; name?: string }>;
  }>;
  const userOptions = dashboard.users as Array<{
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    userRoles?: Array<{ role?: { id?: string; code?: string } }>;
  }>;
  const roleOptions = dashboard.roles as Array<{ id?: string; code?: string; name?: string }>;
  const orgUnitOptions = dashboard.orgUnits as Array<{ id?: string; name?: string }>;
  const categoryOptions = dashboard.categories as Array<{ id?: string; name?: string; slug?: string }>;
  const productOptions = dashboard.products as Array<{ id?: string; name?: string; status?: string; slug?: string }>;
  const sellerProfileOptions = dashboard.sellerProfiles as Array<{
    id?: string;
    displayName?: string;
    sellerType?: string;
  }>;
  const buyerProfileOptions = dashboard.buyerProfiles as Array<{
    id?: string;
    displayName?: string;
    buyerType?: string;
  }>;
  const retailOrders = dashboard.retailOrders as Array<{
    id?: string;
    status?: string;
    totalAmountMinor?: number;
    currency?: string;
    buyerProfile?: { displayName?: string };
  }>;
  const wholesaleRfqs = dashboard.wholesaleRfqs as Array<{
    id?: string;
    tenantId?: string;
    title?: string;
    status?: string;
    currency?: string;
    buyerProfile?: { displayName?: string };
    quotes?: Array<{ id?: string; status?: string; sellerProfile?: { displayName?: string }; amountMinor?: number; currency?: string }>;
    createdAt?: string;
  }>;
  const wholesaleDeals = dashboard.wholesaleDeals as Array<{
    id?: string;
    status?: string;
    contractId?: string | null;
    rfqId?: string | null;
    acceptedQuoteId?: string | null;
    dealRoom?: { id?: string; status?: string } | null;
    createdAt?: string;
  }>;
  const wholesaleDealDetails = dashboard.wholesaleDealDetails as Array<{
    id?: string;
    status?: string;
    contractId?: string | null;
    acceptedQuoteId?: string | null;
    rfq?: { id?: string; title?: string; status?: string } | null;
    dealRoom?: { id?: string; status?: string } | null;
    documentLinkage?: unknown;
    createdAt?: string;
  }>;
  const contracts = dashboard.contracts as Array<{
    id?: string;
    dealId?: string;
    contractType?: string;
    status?: string;
    title?: string;
    versions?: Array<{ id?: string; versionNumber?: number; label?: string }>;
  }>;
  const documents = dashboard.documents as Array<{
    id?: string;
    documentType?: string;
    status?: string;
    name?: string;
    storageBucket?: string | null;
    storageKey?: string | null;
    links?: Array<{ id?: string; linkType?: string; dealId?: string | null; contractId?: string | null }>;
  }>;
  const paymentTransactions = dashboard.paymentTransactions as Array<{
    id?: string;
    dealId?: string;
    status?: string;
    currency?: string;
    totalAmountMinor?: number;
    heldAmountMinor?: number;
    releasedAmountMinor?: number;
    refundedAmountMinor?: number;
  }>;
  const disputes = dashboard.disputes as Array<{
    id?: string;
    dealId?: string | null;
    paymentTransactionId?: string | null;
    disputeType?: string;
    status?: string;
    reason?: string;
  }>;
  const logisticsProviders = dashboard.logisticsProviders as Array<{
    id?: string;
    name?: string;
    status?: string;
    contactEmail?: string | null;
    capabilityProfile?: {
      transportTypes?: string[];
      serviceTypes?: string[];
      cargoCategories?: string[];
      supportedRegions?: string[];
      deliveryModes?: string[];
      additionalServices?: string[];
    } | null;
  }>;
  const logisticsSelections = dashboard.logisticsSelections as Array<{
    id?: string;
    dealId?: string;
    status?: string;
    logisticsProviderId?: string;
    logisticsProvider?: { name?: string };
    notes?: string | null;
  }>;
  const rfqOptions = wholesaleRfqs.length > 0 ? wholesaleRfqs : [];

  return (
    <section style={{ display: 'grid', gap: 24 }}>
      <h1>Admin Control Center</h1>
      <p>
        Authenticated via Keycloak realm <strong>{keycloakRealm}</strong> as{' '}
        <strong>{authContext?.email ?? authContext?.username ?? 'unknown-user'}</strong>.
      </p>
      <p>
        Tenant context: <strong>{authContext?.tenantId ?? 'platform'}</strong> | Roles:{' '}
        <strong>{authContext?.roles?.join(', ') || 'none'}</strong> | <a href="/auth/logout">Logout</a>
      </p>
      <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <a href="#identity">Identity</a>
        <a href="#catalog">Catalog</a>
        <a href="#wholesale">Wholesale</a>
        <a href="#contracts">Contracts</a>
        <a href="#payments">Payments</a>
        <a href="#logistics">Logistics</a>
        <a href="#approvals">Approvals</a>
      </nav>
      <div id="identity" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
        <article style={{ padding: 16, background: '#1f2937', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>API Health</h2>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>
            {JSON.stringify(dashboard.health, null, 2)}
          </pre>
        </article>
        <article style={{ padding: 16, background: '#1f2937', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Tenants</h2>
          <p style={{ fontSize: 28, margin: '8px 0' }}>{dashboard.tenants.length}</p>
          <p style={{ marginBottom: 0 }}>Live list from <code>/api/tenants</code></p>
        </article>
        <article style={{ padding: 16, background: '#1f2937', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Users</h2>
          <p style={{ fontSize: 28, margin: '8px 0' }}>{dashboard.users.length}</p>
          <p style={{ marginBottom: 0 }}>Live list from <code>/api/identity/users</code></p>
        </article>
        <article style={{ padding: 16, background: '#1f2937', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Pending Approvals</h2>
          <p style={{ fontSize: 28, margin: '8px 0' }}>{approvals.length}</p>
          <p style={{ marginBottom: 0 }}>Critical actions are routed through <code>/api/admin/approvals</code></p>
        </article>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
        <article style={{ padding: 16, background: '#111827', border: '1px solid #374151', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Recent Tenants</h2>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {dashboard.tenants.slice(0, 5).map((tenant, index) => {
              const record = tenant as { id?: string; name?: string; slug?: string; status?: string };

              return (
                <li key={record.id ?? record.slug ?? `tenant-${index}`}>
                  {record.name ?? 'Unknown tenant'} ({record.slug ?? 'no-slug'}) [{record.status ?? 'unknown'}]
                </li>
              );
            })}
          </ul>
        </article>
        <article style={{ padding: 16, background: '#111827', border: '1px solid #374151', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Recent Users</h2>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {dashboard.users.slice(0, 5).map((user, index) => {
              const record = user as {
                id?: string;
                email?: string;
                firstName?: string;
                lastName?: string;
                status?: string;
              };

              return (
                <li key={record.id ?? record.email ?? `user-${index}`}>
                  {record.firstName ?? 'Unknown'} {record.lastName ?? ''} ({record.email ?? 'no-email'}) [
                  {record.status ?? 'unknown'}]
                </li>
              );
            })}
          </ul>
        </article>
      </div>

      <div id="approvals" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
        <article style={{ padding: 16, background: '#111827', border: '1px solid #374151', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Approval Queue</h2>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {approvals.length === 0 ? <li>No pending approvals.</li> : null}
            {approvals.slice(0, 10).map((approval) => (
              <li key={approval.id}>
                {approval.module} / {approval.approvalType} [{approval.status}] {approval.subjectType}:{approval.subjectId}
              </li>
            ))}
          </ul>
        </article>
        <article style={{ padding: 16, background: '#111827', border: '1px solid #374151', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Approval Actions</h2>
          <form action={approveApprovalAction} style={{ display: 'grid', gap: 8 }}>
            <select name="approvalId" defaultValue={approvals[0]?.id ?? ''} required>
              {approvals.map((approval) => (
                <option key={approval.id} value={approval.id}>
                  {approval.approvalType} [{approval.subjectType}:{approval.subjectId}]
                </option>
              ))}
            </select>
            <input name="comment" placeholder="Approval comment" />
            <button type="submit">Approve</button>
          </form>
          <form action={rejectApprovalAction} style={{ display: 'grid', gap: 8, marginTop: 16 }}>
            <select name="approvalId" defaultValue={approvals[0]?.id ?? ''} required>
              {approvals.map((approval) => (
                <option key={approval.id} value={approval.id}>
                  {approval.approvalType} [{approval.subjectType}:{approval.subjectId}]
                </option>
              ))}
            </select>
            <input name="comment" placeholder="Rejection reason" />
            <button type="submit">Reject</button>
          </form>
        </article>
      </div>

      <div id="catalog" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
        <article style={{ padding: 16, background: '#111827', border: '1px solid #374151', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Org Units</h2>
          <p style={{ marginTop: 0 }}>Existing org units: {dashboard.orgUnits.length}</p>
          <form action={createOrgUnitAction} style={{ display: 'grid', gap: 8 }}>
            <select name="tenantId" defaultValue={tenantOptions[0]?.id ?? ''} required>
              {tenantOptions.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
            <select name="organizationId" defaultValue={tenantOptions[0]?.organizations?.[0]?.id ?? ''} required>
              {tenantOptions.flatMap((tenant) =>
                (tenant.organizations ?? []).map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {tenant.name} / {organization.name}
                  </option>
                ))
              )}
            </select>
            <input name="name" placeholder="Org unit name" required />
            <input name="code" placeholder="Org unit code" />
            <select name="parentId" defaultValue="">
              <option value="">No parent</option>
              {orgUnitOptions.map((orgUnit) => (
                <option key={orgUnit.id} value={orgUnit.id}>
                  {orgUnit.name}
                </option>
              ))}
            </select>
            <button type="submit">Create Org Unit</button>
          </form>
        </article>

        <article style={{ padding: 16, background: '#111827', border: '1px solid #374151', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Memberships</h2>
          <p style={{ marginTop: 0 }}>Existing memberships: {dashboard.memberships.length}</p>
          <form action={createMembershipAction} style={{ display: 'grid', gap: 8 }}>
            <select name="tenantId" defaultValue={tenantOptions[0]?.id ?? ''} required>
              {tenantOptions.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
            <select name="userId" defaultValue={userOptions[0]?.id ?? ''} required>
              {userOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.email})
                </option>
              ))}
            </select>
            <select name="organizationId" defaultValue={tenantOptions[0]?.organizations?.[0]?.id ?? ''}>
              <option value="">No organization</option>
              {tenantOptions.flatMap((tenant) =>
                (tenant.organizations ?? []).map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {tenant.name} / {organization.name}
                  </option>
                ))
              )}
            </select>
            <select name="orgUnitId" defaultValue="">
              <option value="">No org unit</option>
              {orgUnitOptions.map((orgUnit) => (
                <option key={orgUnit.id} value={orgUnit.id}>
                  {orgUnit.name}
                </option>
              ))}
            </select>
            <select name="membershipType" defaultValue="member">
              <option value="owner">owner</option>
              <option value="admin">admin</option>
              <option value="member">member</option>
              <option value="viewer">viewer</option>
            </select>
            <select name="status" defaultValue="active">
              <option value="active">active</option>
              <option value="invited">invited</option>
              <option value="suspended">suspended</option>
            </select>
            <button type="submit">Create Membership</button>
          </form>
        </article>

        <article style={{ padding: 16, background: '#111827', border: '1px solid #374151', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Role Assignment</h2>
          <form action={assignRolesAction} style={{ display: 'grid', gap: 8 }}>
            <select name="userId" defaultValue={userOptions[0]?.id ?? ''} required>
              {userOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.email})
                </option>
              ))}
            </select>
            <select
              name="roleIds"
              multiple
              defaultValue={userOptions[0]?.userRoles?.flatMap((entry) => (entry.role?.id ? [entry.role.id] : [])) ?? []}
              style={{ minHeight: 120 }}
            >
              {roleOptions.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.code} {role.name ? `(${role.name})` : ''}
                </option>
              ))}
            </select>
            <button type="submit">Assign Roles</button>
          </form>
        </article>
      </div>

      <div id="wholesale" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
        <article style={{ padding: 16, background: '#111827', border: '1px solid #374151', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Categories</h2>
          <p style={{ marginTop: 0 }}>Existing categories: {dashboard.categories.length}</p>
          <form action={createCategoryAction} style={{ display: 'grid', gap: 8 }}>
            <input name="name" placeholder="Category name" required />
            <input name="slug" placeholder="category-slug" required />
            <input name="description" placeholder="Description" />
            <select name="parentId" defaultValue="">
              <option value="">No parent</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button type="submit">Create Category</button>
          </form>
        </article>

        <article style={{ padding: 16, background: '#111827', border: '1px solid #374151', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Seller Profiles</h2>
          <p style={{ marginTop: 0 }}>Existing seller profiles: {dashboard.sellerProfiles.length}</p>
          <form action={createSellerProfileAction} style={{ display: 'grid', gap: 8 }}>
            <input name="displayName" placeholder="Seller display name" required />
            <select name="sellerType" defaultValue="business">
              <option value="business">business</option>
              <option value="individual">individual</option>
            </select>
            <select name="tenantId" defaultValue="">
              <option value="">No tenant</option>
              {tenantOptions.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
            <select name="userId" defaultValue="">
              <option value="">No user</option>
              {userOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.email})
                </option>
              ))}
            </select>
            <button type="submit">Create Seller</button>
          </form>
        </article>

        <article style={{ padding: 16, background: '#111827', border: '1px solid #374151', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Products</h2>
          <p style={{ marginTop: 0 }}>Existing products: {dashboard.products.length}</p>
          <form action={createProductAction} style={{ display: 'grid', gap: 8 }}>
            <select name="sellerProfileId" defaultValue={sellerProfileOptions[0]?.id ?? ''} required>
              {sellerProfileOptions.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.displayName} [{profile.sellerType}]
                </option>
              ))}
            </select>
            <select name="categoryId" defaultValue={categoryOptions[0]?.id ?? ''} required>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input name="name" placeholder="Product name" required />
            <input name="slug" placeholder="product-slug" required />
            <input name="sku" placeholder="SKU-001" required />
            <input name="description" placeholder="Description" />
            <input name="amountMinor" type="number" min="0" defaultValue="0" required />
            <select name="currency" defaultValue="USD">
              <option value="USD">USD</option>
            </select>
            <select name="status" defaultValue="draft">
              <option value="draft">draft</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </select>
            <select name="targetMarket" defaultValue="both">
              <option value="both">both</option>
              <option value="b2c">b2c</option>
              <option value="b2b">b2b</option>
            </select>
            <button type="submit">Create Product</button>
          </form>
        </article>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
        <article style={{ padding: 16, background: '#111827', border: '1px solid #374151', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Retail Orders</h2>
          <p style={{ marginTop: 0 }}>Existing orders: {dashboard.retailOrders.length}</p>
          <form action={createRetailOrderAction} style={{ display: 'grid', gap: 8 }}>
            <select name="buyerProfileId" defaultValue={buyerProfileOptions[0]?.id ?? ''} required>
              {buyerProfileOptions.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.displayName} [{profile.buyerType}]
                </option>
              ))}
            </select>
            <select name="productId" defaultValue={productOptions[0]?.id ?? ''} required>
              {productOptions.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <input name="quantity" type="number" min="1" defaultValue="1" required />
            <button type="submit">Create Retail Order</button>
          </form>
        </article>
        <article style={{ padding: 16, background: '#111827', border: '1px solid #374151', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Retail Order State</h2>
          <form action={updateRetailOrderStatusAction} style={{ display: 'grid', gap: 8 }}>
            <select name="orderId" defaultValue={retailOrders[0]?.id ?? ''} required>
              {retailOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.id} [{order.status}]
                </option>
              ))}
            </select>
            <select name="status" defaultValue="paid">
              <option value="paid">paid</option>
              <option value="fulfilled">fulfilled</option>
              <option value="cancelled">cancelled</option>
            </select>
            <button type="submit">Update Order Status</button>
          </form>
        </article>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
        <article style={{ padding: 16, background: '#111827', border: '1px solid #374151', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Catalog Snapshot</h2>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {categoryOptions.slice(0, 5).map((category) => (
              <li key={category.id}>
                {category.name} ({category.slug})
              </li>
            ))}
          </ul>
        </article>
        <article style={{ padding: 16, background: '#111827', border: '1px solid #374151', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Products Snapshot</h2>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {productOptions.slice(0, 5).map((product) => (
              <li key={product.id}>
                {product.name} ({product.slug}) [{product.status}]
              </li>
            ))}
          </ul>
        </article>
      </div>

      <article style={{ padding: 16, background: '#111827', border: '1px solid #374151', borderRadius: 12 }}>
        <h2 style={{ marginTop: 0 }}>Retail Orders Snapshot</h2>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          {retailOrders.slice(0, 5).map((order) => (
            <li key={order.id}>
              {order.id} - {order.buyerProfile?.displayName ?? 'Unknown buyer'} - {order.currency}{' '}
              {((order.totalAmountMinor ?? 0) / 100).toFixed(2)} [{order.status}]
            </li>
          ))}
        </ul>
      </article>

      <div id="contracts" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
        <article style={{ padding: 16, background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Wholesale RFQs</h2>
          <p style={{ marginTop: 0 }}>Existing RFQs: {wholesaleRfqs.length}</p>
          <form action={createWholesaleRfqAction} style={{ display: 'grid', gap: 8 }}>
            <select name="tenantId" defaultValue={tenantOptions[0]?.id ?? ''} required>
              {tenantOptions.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
            <select name="buyerProfileId" defaultValue={buyerProfileOptions[0]?.id ?? ''} required>
              {buyerProfileOptions.length > 0 ? (
                buyerProfileOptions.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.displayName} [{profile.buyerType}]
                  </option>
                ))
              ) : (
                <option value="">No buyer profiles available</option>
              )}
            </select>
            <select name="requestedByUserId" defaultValue="">
              <option value="">No requester user</option>
              {userOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.email})
                </option>
              ))}
            </select>
            <input name="title" placeholder="RFQ title" required />
            <textarea name="description" placeholder="RFQ description" rows={4} />
            <select name="currency" defaultValue="USD">
              <option value="USD">USD</option>
            </select>
            <button type="submit">Create RFQ</button>
          </form>
          <ul style={{ paddingLeft: 20, margin: '16px 0 0' }}>
            {wholesaleRfqs.slice(0, 5).map((rfq) => (
              <li key={rfq.id}>
                {rfq.title ?? rfq.id} [{rfq.status ?? 'unknown'}] - {rfq.currency ?? 'USD'} - quotes:{' '}
                {rfq.quotes?.length ?? 0}
              </li>
            ))}
          </ul>
        </article>

        <article style={{ padding: 16, background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Quotes</h2>
          <p style={{ marginTop: 0 }}>Submit supplier response against an RFQ.</p>
          <form action={submitWholesaleQuoteAction} style={{ display: 'grid', gap: 8 }}>
            <select name="rfqId" defaultValue={rfqOptions[0]?.id ?? ''} required>
              {rfqOptions.length > 0 ? (
                rfqOptions.map((rfq) => (
                  <option key={rfq.id} value={rfq.id}>
                    {rfq.title ?? rfq.id} [{rfq.status ?? 'unknown'}]
                  </option>
                ))
              ) : (
                <option value="">No RFQs available</option>
              )}
            </select>
            <select name="sellerProfileId" defaultValue={sellerProfileOptions[0]?.id ?? ''} required>
              {sellerProfileOptions.length > 0 ? (
                sellerProfileOptions.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.displayName} [{profile.sellerType}]
                  </option>
                ))
              ) : (
                <option value="">No seller profiles available</option>
              )}
            </select>
            <input name="amountMinor" type="number" min="0" defaultValue="0" required />
            <select name="currency" defaultValue="USD">
              <option value="USD">USD</option>
            </select>
            <textarea name="message" placeholder="Quote message / terms" rows={4} />
            <button type="submit">Submit Quote</button>
          </form>
          <form action={acceptWholesaleQuoteAction} style={{ display: 'grid', gap: 8, marginTop: 16 }}>
            <input
              name="quoteId"
              placeholder="Quote ID to accept"
              defaultValue={wholesaleRfqs.flatMap((rfq) => rfq.quotes ?? []).find((quote) => quote.id)?.id ?? ''}
              required
            />
            <input name="contractId" placeholder="Optional contract ID placeholder" />
            <button type="submit">Accept Quote</button>
          </form>
        </article>

        <article style={{ padding: 16, background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Deals</h2>
          <p style={{ marginTop: 0 }}>Central wholesale aggregate and deal-room summary.</p>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {wholesaleDeals.slice(0, 5).map((deal) => (
              <li key={deal.id}>
                {deal.id} [{deal.status ?? 'unknown'}] {deal.contractId ? `contract:${deal.contractId}` : 'no-contract'}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            {wholesaleDealDetails.slice(0, 3).map((deal) => (
              <article
                key={deal.id}
                style={{
                  padding: 12,
                  background: '#111827',
                  border: '1px solid #374151',
                  borderRadius: 10
                }}
              >
                <strong>{deal.rfq?.title ?? deal.id}</strong>
                <div>Status: {deal.status ?? 'unknown'}</div>
                <div>Deal Room: {deal.dealRoom?.id ?? 'none'}</div>
                <div>Contract: {deal.contractId ?? 'none'}</div>
                <div>Accepted Quote: {deal.acceptedQuoteId ?? 'none'}</div>
                <details style={{ marginTop: 8 }}>
                  <summary>Document linkage</summary>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0', fontSize: 12 }}>
                    {JSON.stringify(deal.documentLinkage ?? null, null, 2)}
                  </pre>
                </details>
              </article>
            ))}
          </div>
        </article>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
        <article style={{ padding: 16, background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Contracts</h2>
          <p style={{ marginTop: 0 }}>Linked contract records: {contracts.length}</p>
          <form action={createContractAction} style={{ display: 'grid', gap: 8 }}>
            <select name="dealId" defaultValue={wholesaleDeals[0]?.id ?? ''} required>
              {wholesaleDeals.map((deal) => (
                <option key={deal.id} value={deal.id}>
                  {deal.id} [{deal.status}]
                </option>
              ))}
            </select>
            <select name="contractType" defaultValue="master_purchase">
              <option value="master_purchase">master_purchase</option>
              <option value="supply_agreement">supply_agreement</option>
              <option value="annex">annex</option>
              <option value="custom">custom</option>
            </select>
            <input name="title" placeholder="Contract title" required />
            <button type="submit">Create Contract</button>
          </form>
          <form action={createContractVersionAction} style={{ display: 'grid', gap: 8, marginTop: 16 }}>
            <select name="contractId" defaultValue={contracts[0]?.id ?? ''} required>
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.title} [{contract.status}]
                </option>
              ))}
            </select>
            <input name="label" placeholder="Version label" />
            <input name="storageBucket" placeholder="Bucket" defaultValue="documents" />
            <input name="storageKey" placeholder="Storage key" />
            <select name="createdByUserId" defaultValue="">
              <option value="">No creator user</option>
              {userOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.email})
                </option>
              ))}
            </select>
            <button type="submit">Add Version</button>
          </form>
        </article>

        <article style={{ padding: 16, background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Documents</h2>
          <p style={{ marginTop: 0 }}>Storage metadata only: {documents.length}</p>
          <form action={createDocumentAction} style={{ display: 'grid', gap: 8 }}>
            <select name="tenantId" defaultValue={tenantOptions[0]?.id ?? ''}>
              <option value="">No tenant</option>
              {tenantOptions.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
            <select name="uploadedByUserId" defaultValue="">
              <option value="">No uploader user</option>
              {userOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.email})
                </option>
              ))}
            </select>
            <select name="documentType" defaultValue="attachment">
              <option value="contract">contract</option>
              <option value="attachment">attachment</option>
              <option value="evidence">evidence</option>
              <option value="commercial">commercial</option>
              <option value="compliance">compliance</option>
              <option value="other">other</option>
            </select>
            <input name="name" placeholder="Document name" required />
            <input name="contentType" placeholder="application/pdf" />
            <input name="storageBucket" placeholder="documents" defaultValue="documents" />
            <input name="storageKey" placeholder="contracts/demo.pdf" />
            <button type="submit">Create Document</button>
          </form>
          <form action={createDocumentLinkAction} style={{ display: 'grid', gap: 8, marginTop: 16 }}>
            <select name="documentId" defaultValue={documents[0]?.id ?? ''} required>
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.name} [{document.status}]
                </option>
              ))}
            </select>
            <select name="dealId" defaultValue="">
              <option value="">No deal</option>
              {wholesaleDeals.map((deal) => (
                <option key={deal.id} value={deal.id}>
                  {deal.id}
                </option>
              ))}
            </select>
            <select name="contractId" defaultValue="">
              <option value="">No contract</option>
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.title}
                </option>
              ))}
            </select>
            <select name="linkType" defaultValue="deal_attachment">
              <option value="deal_attachment">deal_attachment</option>
              <option value="contract_attachment">contract_attachment</option>
              <option value="supporting_evidence">supporting_evidence</option>
            </select>
            <button type="submit">Link Document</button>
          </form>
          <form action={updateDocumentStatusAction} style={{ display: 'grid', gap: 8, marginTop: 16 }}>
            <select name="documentId" defaultValue={documents[0]?.id ?? ''} required>
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.name} [{document.status}]
                </option>
              ))}
            </select>
            <select name="status" defaultValue="approved">
              <option value="uploaded">uploaded</option>
              <option value="linked">linked</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
            </select>
            <button type="submit">Update Document Status</button>
          </form>
        </article>

        <article style={{ padding: 16, background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Contract / Document Snapshot</h2>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {contracts.slice(0, 5).map((contract) => (
              <li key={contract.id}>
                {contract.title} [{contract.status}] versions:{contract.versions?.length ?? 0}
              </li>
            ))}
          </ul>
          <ul style={{ paddingLeft: 20, margin: '16px 0 0' }}>
            {documents.slice(0, 5).map((document) => (
              <li key={document.id}>
                {document.name} [{document.status}] links:{document.links?.length ?? 0}
              </li>
            ))}
          </ul>
        </article>
      </div>

      <div id="payments" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
        <article style={{ padding: 16, background: '#0b1220', border: '1px solid #334155', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Payments / Escrow</h2>
          <p style={{ marginTop: 0 }}>Transactions: {paymentTransactions.length}</p>
          <form action={createPaymentTransactionAction} style={{ display: 'grid', gap: 8 }}>
            <select name="dealId" defaultValue={wholesaleDeals[0]?.id ?? ''} required>
              {wholesaleDeals.map((deal) => (
                <option key={deal.id} value={deal.id}>
                  {deal.id} [{deal.status}]
                </option>
              ))}
            </select>
            <input name="totalAmountMinor" type="number" min="0" defaultValue="0" required />
            <select name="currency" defaultValue="USD">
              <option value="USD">USD</option>
            </select>
            <button type="submit">Create Transaction</button>
          </form>
          <form action={holdPaymentAction} style={{ display: 'grid', gap: 8, marginTop: 16 }}>
            <select name="paymentTransactionId" defaultValue={paymentTransactions[0]?.id ?? ''} required>
              {paymentTransactions.map((transaction) => (
                <option key={transaction.id} value={transaction.id}>
                  {transaction.id} [{transaction.status}]
                </option>
              ))}
            </select>
            <button type="submit">Hold Funds</button>
          </form>
          <form action={releasePaymentAction} style={{ display: 'grid', gap: 8, marginTop: 16 }}>
            <select name="paymentTransactionId" defaultValue={paymentTransactions[0]?.id ?? ''} required>
              {paymentTransactions.map((transaction) => (
                <option key={transaction.id} value={transaction.id}>
                  {transaction.id} [{transaction.status}]
                </option>
              ))}
            </select>
            <input name="amountMinor" type="number" min="1" defaultValue="1000" required />
            <input name="note" placeholder="Release note" />
            <button type="submit">Release Funds</button>
          </form>
          <form action={refundPaymentAction} style={{ display: 'grid', gap: 8, marginTop: 16 }}>
            <select name="paymentTransactionId" defaultValue={paymentTransactions[0]?.id ?? ''} required>
              {paymentTransactions.map((transaction) => (
                <option key={transaction.id} value={transaction.id}>
                  {transaction.id} [{transaction.status}]
                </option>
              ))}
            </select>
            <input name="amountMinor" type="number" min="1" defaultValue="1000" required />
            <input name="note" placeholder="Refund note" />
            <button type="submit">Refund Funds</button>
          </form>
        </article>

        <article style={{ padding: 16, background: '#0b1220', border: '1px solid #334155', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Disputes</h2>
          <p style={{ marginTop: 0 }}>Recorded disputes: {disputes.length}</p>
          <form action={createDisputeAction} style={{ display: 'grid', gap: 8 }}>
            <select name="dealId" defaultValue={wholesaleDeals[0]?.id ?? ''}>
              <option value="">No deal</option>
              {wholesaleDeals.map((deal) => (
                <option key={deal.id} value={deal.id}>
                  {deal.id}
                </option>
              ))}
            </select>
            <select name="paymentTransactionId" defaultValue={paymentTransactions[0]?.id ?? ''}>
              <option value="">No payment transaction</option>
              {paymentTransactions.map((transaction) => (
                <option key={transaction.id} value={transaction.id}>
                  {transaction.id}
                </option>
              ))}
            </select>
            <select name="disputeType" defaultValue="payment">
              <option value="payment">payment</option>
              <option value="document">document</option>
              <option value="commercial">commercial</option>
            </select>
            <textarea name="reason" placeholder="Dispute reason" rows={4} required />
            <button type="submit">Create Dispute</button>
          </form>
          <ul style={{ paddingLeft: 20, margin: '16px 0 0' }}>
            {disputes.slice(0, 5).map((dispute) => (
              <li key={dispute.id}>
                {dispute.disputeType} [{dispute.status}] {dispute.reason}
              </li>
            ))}
          </ul>
        </article>

        <article style={{ padding: 16, background: '#0b1220', border: '1px solid #334155', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Financial Snapshot</h2>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {paymentTransactions.slice(0, 5).map((transaction) => (
              <li key={transaction.id}>
                {transaction.currency} {((transaction.totalAmountMinor ?? 0) / 100).toFixed(2)} [{transaction.status}] held:
                {((transaction.heldAmountMinor ?? 0) / 100).toFixed(2)} released:
                {((transaction.releasedAmountMinor ?? 0) / 100).toFixed(2)} refunded:
                {((transaction.refundedAmountMinor ?? 0) / 100).toFixed(2)}
              </li>
            ))}
          </ul>
        </article>
      </div>

      <div id="logistics" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
        <article style={{ padding: 16, background: '#0b1220', border: '1px solid #334155', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Logistics Providers</h2>
          <p style={{ marginTop: 0 }}>Providers: {logisticsProviders.length}</p>
          <form action={createLogisticsProviderAction} style={{ display: 'grid', gap: 8 }}>
            <input name="name" placeholder="Provider name" required />
            <input name="contactEmail" placeholder="ops@example.com" />
            <button type="submit">Create Provider</button>
          </form>
          <form action={updateLogisticsProviderStatusAction} style={{ display: 'grid', gap: 8, marginTop: 16 }}>
            <select name="providerId" defaultValue={logisticsProviders[0]?.id ?? ''} required>
              {logisticsProviders.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} [{provider.status}]
                </option>
              ))}
            </select>
            <select name="status" defaultValue="active">
              <option value="draft">draft</option>
              <option value="active">active</option>
              <option value="suspended">suspended</option>
            </select>
            <button type="submit">Update Provider Status</button>
          </form>
        </article>

        <article style={{ padding: 16, background: '#0b1220', border: '1px solid #334155', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Capability Profile</h2>
          <form action={updateCapabilityProfileAction} style={{ display: 'grid', gap: 8 }}>
            <select name="providerId" defaultValue={logisticsProviders[0]?.id ?? ''} required>
              {logisticsProviders.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
            <input name="transportTypes" placeholder="road, air" />
            <input name="serviceTypes" placeholder="express, scheduled" />
            <input name="cargoCategories" placeholder="electronics, fragile" />
            <input name="supportedRegions" placeholder="EU, MENA" />
            <input name="deliveryModes" placeholder="door_to_door" />
            <input name="additionalServices" placeholder="tracking, insurance" />
            <button type="submit">Save Capability Profile</button>
          </form>
        </article>

        <article style={{ padding: 16, background: '#0b1220', border: '1px solid #334155', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Deal Logistics Selection</h2>
          <form action={selectLogisticsProviderAction} style={{ display: 'grid', gap: 8 }}>
            <select name="dealId" defaultValue={wholesaleDeals[0]?.id ?? ''} required>
              {wholesaleDeals.map((deal) => (
                <option key={deal.id} value={deal.id}>
                  {deal.id}
                </option>
              ))}
            </select>
            <select name="logisticsProviderId" defaultValue={logisticsProviders[0]?.id ?? ''} required>
              {logisticsProviders.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} [{provider.status}]
                </option>
              ))}
            </select>
            <input name="notes" placeholder="Selection note" />
            <button type="submit">Select Provider</button>
          </form>
          <ul style={{ paddingLeft: 20, margin: '16px 0 0' }}>
            {logisticsSelections.slice(0, 5).map((selection) => (
              <li key={selection.id}>
                deal:{selection.dealId} provider:{selection.logisticsProvider?.name ?? selection.logisticsProviderId} [{selection.status}]
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
