import {
  createAssignmentAction,
  createPartnerAction,
  createPartnerUserAction,
  linkExistingPartnerUserAction,
  updateAssignmentAction,
  updatePartnerAction
} from '../actions';
import { getAdminDashboardData } from '../../lib/api';
import { requireAccessToken } from '../../lib/auth';

export const dynamic = 'force-dynamic';

const partnerTypes = ['logistics_company', 'customs_broker', 'insurance_company', 'surveyor', 'bank'] as const;

function normalizeSearchParam(value?: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

async function fetchJson<T>(path: string, accessToken: string) {
  const internalBaseUrl = process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
  const response = await fetch(`${internalBaseUrl}${path}`, {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export default async function PartnersPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const dashboard = await getAdminDashboardData();
  const accessToken = await requireAccessToken('/partners');
  const resolvedSearchParams = (await searchParams) ?? {};
  const tenantId = normalizeSearchParam(resolvedSearchParams.tenantId) || (dashboard.tenants[0] as { id?: string } | undefined)?.id || '';
  const searchQuery = normalizeSearchParam(resolvedSearchParams.q).trim().toLowerCase();
  const partnerTypeFilter = normalizeSearchParam(resolvedSearchParams.partnerType);
  const tenantDetail = tenantId
    ? await fetchJson<{ id: string; name: string; slug: string; organizations: Array<any>; memberships: Array<any> }>(`/api/tenants/${tenantId}`, accessToken)
    : null;
  const assignments = tenantId
    ? await fetchJson<{ items: Array<any> }>(`/api/partner-ops/assignments?tenantId=${encodeURIComponent(tenantId)}`, accessToken)
    : { items: [] as Array<any> };

  const organizations = (tenantDetail?.organizations ?? []).filter((organization) => {
    if (!partnerTypes.includes(organization.partnerType)) {
      return false;
    }

    if (partnerTypeFilter && partnerTypeFilter !== 'all' && organization.partnerType !== partnerTypeFilter) {
      return false;
    }

    if (!searchQuery) {
      return true;
    }

    return [
      organization.name,
      organization.legalName,
      organization.contactName,
      organization.contactEmail,
      organization.contactPhone,
      organization.country,
      organization.address,
      organization.notes,
      organization.linkedUser?.email,
      organization.linkedUser?.firstName,
      organization.linkedUser?.lastName
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(searchQuery));
  });
  const linkedUsers = (tenantDetail?.memberships ?? [])
    .filter((membership) => membership.user && membership.organizationId)
    .map((membership) => ({
      id: membership.userId,
      email: membership.user?.email ?? membership.userId,
      firstName: membership.user?.firstName ?? '',
      lastName: membership.user?.lastName ?? '',
      organizationId: membership.organizationId,
      membershipType: membership.membershipType,
      status: membership.status
    }));

  const logisticsRole = (dashboard.roles as Array<{ id?: string; code?: string }>).find((role) => role.code === 'logistics_company');
  const customsRole = (dashboard.roles as Array<{ id?: string; code?: string }>).find((role) => role.code === 'customs_broker');
  const users = (dashboard.users as Array<{
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  }>).filter((user) => Boolean(user.id));

  return (
    <section style={{ display: 'grid', gap: 20 }}>
      <header style={{ display: 'grid', gap: 8 }}>
        <h1 style={{ margin: 0 }}>Partners</h1>
        <p style={{ margin: 0 }}>Admin-only partner registry, linked users, and assignment controls.</p>
        <form method="get" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span>Tenant</span>
            <select name="tenantId" defaultValue={tenantId}>
              {(dashboard.tenants as Array<{ id?: string; name?: string; slug?: string }>).map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} ({tenant.slug})
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span>Search</span>
            <input name="q" defaultValue={normalizeSearchParam(resolvedSearchParams.q)} placeholder="Search partners" />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span>Type</span>
            <select name="partnerType" defaultValue={partnerTypeFilter || 'all'}>
              <option value="all">All</option>
              {partnerTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Load tenant</button>
          <a href="/admin">Back to dashboard</a>
          <a href="/admin/settings/smtp">SMTP settings</a>
        </form>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
        <article style={{ padding: 16, background: '#111827', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Create partner</h2>
          <form action={createPartnerAction} style={{ display: 'grid', gap: 8 }}>
            <input type="hidden" name="tenantId" value={tenantId} />
            <input name="name" placeholder="Company name" required />
            <input name="legalName" placeholder="Legal name" />
            <select name="partnerType" defaultValue="logistics_company">
              {partnerTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <select name="status" defaultValue="active">
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
            <input name="contactName" placeholder="Contact name" />
            <input name="contactEmail" placeholder="Contact email" />
            <input name="contactPhone" placeholder="Contact phone" />
            <input name="country" placeholder="Country" />
            <select name="linkedUserId" defaultValue="">
              <option value="">No linked user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email ?? user.id}
                </option>
              ))}
            </select>
            <textarea name="address" placeholder="Address" />
            <textarea name="notes" placeholder="Notes" />
            <button type="submit">Create partner</button>
          </form>
        </article>

        <article style={{ padding: 16, background: '#111827', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Create linked users</h2>
          <p>Only logistics and customs partners can receive user accounts or linked logins.</p>
          <div style={{ display: 'grid', gap: 12 }}>
            {organizations.filter((organization) => ['logistics_company', 'customs_broker'].includes(organization.partnerType ?? '')).map((organization: any) => (
              <div key={organization.id} style={{ display: 'grid', gap: 8, border: '1px solid #374151', padding: 12, borderRadius: 8 }}>
                <strong>{organization.name}</strong>
                <div>Current linked user: {organization.linkedUser?.email ?? 'none'}</div>
                <form action={linkExistingPartnerUserAction} style={{ display: 'grid', gap: 8 }}>
                  <input type="hidden" name="tenantId" value={tenantId} />
                  <input type="hidden" name="organizationId" value={organization.id} />
                  <input type="hidden" name="roleId" value={(organization.partnerType === 'customs_broker' ? customsRole?.id : logisticsRole?.id) ?? ''} />
                  <select name="userId" defaultValue={organization.linkedUserId ?? ''} required>
                    <option value="">Select existing user</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.email ?? user.id}
                      </option>
                    ))}
                  </select>
                  <button type="submit">Link existing user</button>
                </form>
                <form action={createPartnerUserAction} style={{ display: 'grid', gap: 8 }}>
                  <input type="hidden" name="tenantId" value={tenantId} />
                  <input type="hidden" name="organizationId" value={organization.id} />
                  <input type="hidden" name="roleIds" value={(organization.partnerType === 'customs_broker' ? customsRole?.id : logisticsRole?.id) ?? ''} />
                  <input type="text" name="firstName" placeholder="First name" required />
                  <input type="text" name="lastName" placeholder="Last name" required />
                  <input type="email" name="email" placeholder="Email" required />
                  <button type="submit">Create user from partner</button>
                </form>
              </div>
            ))}
            {!organizations.some((organization) => ['logistics_company', 'customs_broker'].includes(organization.partnerType ?? '')) ? (
              <p>No logistics or customs partners yet.</p>
            ) : null}
          </div>
        </article>

        <article style={{ padding: 16, background: '#111827', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Create assignment</h2>
          <form action={createAssignmentAction} style={{ display: 'grid', gap: 8 }}>
            <input type="hidden" name="tenantId" value={tenantId} />
            <select name="kind" defaultValue="shipment">
              <option value="shipment">Shipment</option>
              <option value="customs">Customs</option>
            </select>
            <input name="subjectType" placeholder="Subject type" required />
            <input name="subjectId" placeholder="Subject ID" required />
            <select name="partnerOrganizationId" defaultValue="">
              <option value="">No partner</option>
              {organizations.map((organization: any) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
            <select name="partnerUserId" defaultValue="">
              <option value="">No user</option>
              {linkedUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email}
                </option>
              ))}
            </select>
            <input name="reference" placeholder="Reference" />
            <input name="status" placeholder="Status" />
            <textarea name="notes" placeholder="Notes" />
            <button type="submit">Create assignment</button>
          </form>
        </article>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
        <article style={{ padding: 16, background: '#111827', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Existing partners</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {organizations.length ? (
              organizations.map((organization: any) => (
                <form key={organization.id} action={updatePartnerAction} style={{ display: 'grid', gap: 8, border: '1px solid #374151', padding: 12, borderRadius: 8 }}>
                  <input type="hidden" name="tenantId" value={tenantId} />
                  <input type="hidden" name="organizationId" value={organization.id} />
                  <strong>{organization.name}</strong>
                  <div>Linked user: {organization.linkedUser?.email ?? 'none'}</div>
                  <input name="name" defaultValue={organization.name ?? ''} />
                  <input name="legalName" defaultValue={organization.legalName ?? ''} placeholder="Legal name" />
                  <select name="partnerType" defaultValue={organization.partnerType ?? 'logistics_company'}>
                    {partnerTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <select name="status" defaultValue={organization.status ?? 'active'}>
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                  <select name="linkedUserId" defaultValue={organization.linkedUserId ?? ''}>
                    <option value="">No linked user</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.email ?? user.id}
                      </option>
                    ))}
                  </select>
                  <input name="contactName" defaultValue={organization.contactName ?? ''} placeholder="Contact name" />
                  <input name="contactEmail" defaultValue={organization.contactEmail ?? ''} placeholder="Contact email" />
                  <input name="contactPhone" defaultValue={organization.contactPhone ?? ''} placeholder="Contact phone" />
                  <input name="country" defaultValue={organization.country ?? ''} placeholder="Country" />
                  <textarea name="address" defaultValue={organization.address ?? ''} placeholder="Address" />
                  <textarea name="notes" defaultValue={organization.notes ?? ''} placeholder="Notes" />
                  <button type="submit">Save partner</button>
                </form>
              ))
            ) : (
              <p>No partners yet.</p>
            )}
          </div>
        </article>

        <article style={{ padding: 16, background: '#111827', borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Existing assignments</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {(assignments.items ?? []).length ? (
              (assignments.items ?? []).map((assignment: any) => (
                <form key={assignment.id} action={updateAssignmentAction} style={{ display: 'grid', gap: 8, border: '1px solid #374151', padding: 12, borderRadius: 8 }}>
                  <input type="hidden" name="assignmentId" value={assignment.id} />
                  <strong>{assignment.reference ?? assignment.subjectId}</strong>
                  <div>
                    {assignment.kind} · {assignment.subjectType}
                  </div>
                  <select name="partnerOrganizationId" defaultValue={assignment.partnerOrganizationId ?? ''}>
                    <option value="">No partner</option>
                    {organizations.map((organization: any) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name}
                      </option>
                    ))}
                  </select>
                  <select name="partnerUserId" defaultValue={assignment.partnerUserId ?? ''}>
                    <option value="">No user</option>
                    {linkedUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.email}
                      </option>
                    ))}
                  </select>
                  <input name="reference" defaultValue={assignment.reference ?? ''} placeholder="Reference" />
                  <input name="status" defaultValue={assignment.status ?? ''} placeholder="Status" />
                  <textarea name="notes" defaultValue={assignment.notes ?? ''} placeholder="Notes" />
                  <button type="submit">Save assignment</button>
                </form>
              ))
            ) : (
              <p>No assignments yet.</p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
