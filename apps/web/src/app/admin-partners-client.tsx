'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './core-flow.module.css';

type AuthRedirectError = Error & { name: 'AuthRedirectError' };

type Tenant = {
  id: string;
  name: string;
  slug: string;
  organizations: Organization[];
  memberships: Array<{
    id: string;
    userId: string;
    organizationId: string | null;
    membershipType: string;
    status: string;
    user?: { id: string; email?: string | null; firstName?: string | null; lastName?: string | null } | null;
  }>;
};

type Organization = {
  id: string;
  name: string;
  legalName?: string | null;
  partnerType?: string | null;
  status?: string | null;
  linkedUserId?: string | null;
  linkedUser?: { id: string; email?: string | null; firstName?: string | null; lastName?: string | null } | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  country?: string | null;
  notes?: string | null;
};

type Role = {
  id: string;
  code: string;
  name: string;
};

type Assignment = {
  id: string;
  kind: string;
  subjectType: string;
  subjectId: string;
  partnerOrganizationId?: string | null;
  partnerUserId?: string | null;
  reference?: string | null;
  status: string;
  notes?: string | null;
};

type LoadState<T> = { loading: boolean; data: T; error: string | null };

const partnerTypes = [
  { value: 'logistics_company', label: 'Logistics Companies' },
  { value: 'customs_broker', label: 'Customs Brokers' },
  { value: 'insurance_company', label: 'Insurance Companies' },
  { value: 'surveyor', label: 'Surveyors' },
  { value: 'bank', label: 'Banks' }
];

function redirectToSignIn() {
  if (typeof window !== 'undefined') {
    window.location.assign(`/signin?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }
}

async function adminJson<T>(path: string, init?: RequestInit) {
  const hasBody = init?.body !== undefined && init?.body !== null;
  const response = await fetch(`/api/${path}`, {
    ...init,
    headers: {
      ...(hasBody ? { 'content-type': 'application/json' } : {}),
      ...(init?.headers ?? {})
    },
    cache: 'no-store'
  });

  const text = await response.text();
  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      redirectToSignIn();
      throw new Error('Authentication required');
    }

    const message =
      typeof data === 'object' && data !== null && 'message' in data && typeof (data as { message?: unknown }).message === 'string'
        ? String((data as { message: string }).message)
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export function AdminPartnersBoard() {
  const [tenantsState, setTenantsState] = useState<LoadState<Array<{ id: string; name: string; slug: string }>>>({
    loading: true,
    data: [],
    error: null
  });
  const [rolesState, setRolesState] = useState<LoadState<Role[]>>({ loading: true, data: [], error: null });
  const [usersState, setUsersState] = useState<LoadState<Array<{ id: string; email?: string | null; firstName?: string | null; lastName?: string | null }>>>({
    loading: true,
    data: [],
    error: null
  });
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('');
  const [tenantDetail, setTenantDetail] = useState<Tenant | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState<Organization | null>(null);
  const [partnerFilter, setPartnerFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [orgDraft, setOrgDraft] = useState({
    name: '',
    legalName: '',
    partnerType: 'logistics_company',
    status: 'active',
    linkedUserId: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    country: '',
    notes: ''
  });

  const [userDraft, setUserDraft] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });
  const [existingUserDraft, setExistingUserDraft] = useState({
    userId: ''
  });

  const [assignmentDraft, setAssignmentDraft] = useState({
    id: '',
    kind: 'shipment',
    subjectType: '',
    subjectId: '',
    partnerOrganizationId: '',
    partnerUserId: '',
    reference: '',
    status: '',
    notes: ''
  });

  const selectedTenant = useMemo(() => tenantDetail, [tenantDetail]);

  async function loadTenants() {
    setTenantsState((current) => ({ ...current, loading: true, error: null }));
    try {
      const items = await adminJson<Array<{ id: string; name: string; slug: string }>>('tenants');
      setTenantsState({ loading: false, data: items, error: null });
      setSelectedTenantId((current) => current || items[0]?.id || '');
    } catch (failure) {
      setTenantsState({ loading: false, data: [], error: failure instanceof Error ? failure.message : 'Unable to load tenants.' });
    }
  }

  async function loadRoles() {
    setRolesState((current) => ({ ...current, loading: true, error: null }));
    try {
      const response = await adminJson<Role[]>('identity/roles');
      setRolesState({ loading: false, data: response, error: null });
    } catch (failure) {
      setRolesState({ loading: false, data: [], error: failure instanceof Error ? failure.message : 'Unable to load roles.' });
    }
  }

  async function loadUsers() {
    setUsersState((current) => ({ ...current, loading: true, error: null }));
    try {
      const response = await adminJson<Array<{ id: string; email?: string | null; firstName?: string | null; lastName?: string | null }>>('identity/users');
      setUsersState({ loading: false, data: response, error: null });
    } catch (failure) {
      setUsersState({ loading: false, data: [], error: failure instanceof Error ? failure.message : 'Unable to load users.' });
    }
  }

  async function loadTenantDetail(tenantId: string) {
    if (!tenantId) {
      setTenantDetail(null);
      setAssignments([]);
      return;
    }

    try {
      const detail = await adminJson<Tenant>(`tenants/${tenantId}`);
      setTenantDetail(detail);
      setSelectedOrganizationId((current) => current || detail.organizations[0]?.id || '');
      const assignmentResponse = await adminJson<{ items: Assignment[] }>(`partner-ops/assignments?tenantId=${encodeURIComponent(tenantId)}`);
      setAssignments(assignmentResponse.items ?? []);

      const currentAssignment = assignmentResponse.items?.find((assignment) => assignment.id === assignmentDraft.id) ?? null;
      if (currentAssignment) {
        setAssignmentDraft({
          id: currentAssignment.id,
          kind: currentAssignment.kind,
          subjectType: currentAssignment.subjectType,
          subjectId: currentAssignment.subjectId,
          partnerOrganizationId: currentAssignment.partnerOrganizationId ?? '',
          partnerUserId: currentAssignment.partnerUserId ?? '',
          reference: currentAssignment.reference ?? '',
          status: currentAssignment.status ?? '',
          notes: currentAssignment.notes ?? ''
        });
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to load tenant detail.');
    }
  }

  useEffect(() => {
    void loadTenants();
    void loadRoles();
    void loadUsers();
  }, []);

  useEffect(() => {
    if (selectedTenantId) {
      setSelectedOrganizationId('');
      setEditMode(null);
      void loadTenantDetail(selectedTenantId);
    }
  }, [selectedTenantId]);

  const filteredOrganizations = useMemo(() => {
    const organizations = tenantDetail?.organizations ?? [];
    if (partnerFilter === 'all') {
      return organizations.filter((organization) =>
        !searchQuery
          ? true
          : [
              organization.name,
              organization.legalName,
              organization.contactName,
              organization.contactEmail,
              organization.country,
              organization.address,
              organization.notes,
              organization.linkedUser?.email,
              organization.linkedUser?.firstName,
              organization.linkedUser?.lastName
            ]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(searchQuery))
      );
    }
    return organizations.filter((organization) => {
      if (organization.partnerType !== partnerFilter) {
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
  }, [tenantDetail, partnerFilter, searchQuery]);

  const linkedUsers = useMemo(() => {
    return (tenantDetail?.memberships ?? [])
      .filter((membership) => membership.user && membership.organizationId)
      .map((membership) => ({
        id: membership.userId,
        email: membership.user?.email ?? null,
        firstName: membership.user?.firstName ?? null,
        lastName: membership.user?.lastName ?? null,
        organizationId: membership.organizationId,
        membershipType: membership.membershipType,
        status: membership.status
      }));
  }, [tenantDetail]);

  async function saveOrganization() {
    if (!selectedTenantId) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      name: orgDraft.name.trim(),
      legalName: orgDraft.legalName.trim() || undefined,
      partnerType: orgDraft.partnerType || undefined,
      status: orgDraft.status,
      linkedUserId: orgDraft.linkedUserId || undefined,
      contactName: orgDraft.contactName.trim() || undefined,
      contactEmail: orgDraft.contactEmail.trim() || undefined,
      contactPhone: orgDraft.contactPhone.trim() || undefined,
      address: orgDraft.address.trim() || undefined,
      country: orgDraft.country.trim() || undefined,
      notes: orgDraft.notes.trim() || undefined
    };

    try {
      if (editMode) {
        await adminJson(`tenants/${selectedTenantId}/organizations/${editMode.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setSuccess('Partner updated.');
      } else {
        await adminJson(`tenants/${selectedTenantId}/organizations`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setSuccess('Partner created.');
      }
      setEditMode(null);
      setOrgDraft({
        name: '',
        legalName: '',
        partnerType: 'logistics_company',
        status: 'active',
        linkedUserId: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        address: '',
        country: '',
        notes: ''
      });
      await loadTenantDetail(selectedTenantId);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to save partner.');
    } finally {
      setSaving(false);
    }
  }

  async function saveLinkedUser() {
    if (!selectedTenant || !selectedOrganizationId) {
      return;
    }

    const organization = selectedTenant.organizations.find((entry) => entry.id === selectedOrganizationId);
    if (!organization) {
      return;
    }

    const roleCode = organization.partnerType === 'customs_broker' ? 'customs_broker' : 'logistics_company';
    const role = rolesState.data.find((entry) => entry.code === roleCode);
    if (!role) {
      setError(`Missing role ${roleCode}.`);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const user = await adminJson<{ id: string }>('identity/users', {
        method: 'POST',
        body: JSON.stringify({
          email: userDraft.email.trim(),
          firstName: userDraft.firstName.trim(),
          lastName: userDraft.lastName.trim(),
          roleIds: [role.id]
        })
      });

      await adminJson(`tenants/${selectedTenantId}/organizations/${selectedOrganizationId}`, {
        method: 'PUT',
        body: JSON.stringify({
          linkedUserId: user.id
        })
      });

      await adminJson(`tenants/${selectedTenantId}/memberships`, {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          organizationId: selectedOrganizationId,
          membershipType: 'admin',
          status: 'active'
        })
      });

      setSuccess('Linked user created.');
      setUserDraft({ firstName: '', lastName: '', email: '' });
      await loadTenantDetail(selectedTenantId);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to create linked user.');
    } finally {
      setSaving(false);
    }
  }

  async function linkExistingUser() {
    if (!selectedTenant || !selectedOrganizationId || !existingUserDraft.userId) {
      return;
    }

    const organization = selectedTenant.organizations.find((entry) => entry.id === selectedOrganizationId);
    if (!organization) {
      return;
    }

    const roleCode = organization.partnerType === 'customs_broker' ? 'customs_broker' : 'logistics_company';
    const role = rolesState.data.find((entry) => entry.code === roleCode);
    if (!role) {
      setError(`Missing role ${roleCode}.`);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await adminJson(`tenants/${selectedTenantId}/organizations/${selectedOrganizationId}`, {
        method: 'PUT',
        body: JSON.stringify({
          linkedUserId: existingUserDraft.userId
        })
      });

      await adminJson(`identity/users/${existingUserDraft.userId}/roles`, {
        method: 'PUT',
        body: JSON.stringify({
          roleIds: [role.id]
        })
      });

      await adminJson(`tenants/${selectedTenantId}/memberships`, {
        method: 'POST',
        body: JSON.stringify({
          userId: existingUserDraft.userId,
          organizationId: selectedOrganizationId,
          membershipType: 'admin',
          status: 'active'
        })
      });

      setSuccess('Existing user linked.');
      setExistingUserDraft({ userId: '' });
      await loadTenantDetail(selectedTenantId);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to link existing user.');
    } finally {
      setSaving(false);
    }
  }

  async function updateAssignmentDraft() {
    if (!selectedTenantId) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      tenantId: selectedTenantId,
      kind: assignmentDraft.kind,
      subjectType: assignmentDraft.subjectType.trim(),
      subjectId: assignmentDraft.subjectId.trim(),
      partnerOrganizationId: assignmentDraft.partnerOrganizationId || undefined,
      partnerUserId: assignmentDraft.partnerUserId || undefined,
      reference: assignmentDraft.reference.trim() || undefined,
      status: assignmentDraft.status.trim() || undefined,
      notes: assignmentDraft.notes.trim() || undefined
    };

    try {
      if (assignmentDraft.id) {
        await adminJson(`partner-ops/assignments/${assignmentDraft.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setSuccess('Assignment updated.');
      } else {
        await adminJson(`partner-ops/assignments`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setSuccess('Assignment created.');
      }
      setAssignmentDraft({
        id: '',
        kind: 'shipment',
        subjectType: '',
        subjectId: '',
        partnerOrganizationId: '',
        partnerUserId: '',
        reference: '',
        status: '',
        notes: ''
      });
      await loadTenantDetail(selectedTenantId);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to save assignment.');
    } finally {
      setSaving(false);
    }
  }

  function editOrganization(organization: Organization) {
    setEditMode(organization);
    setSelectedOrganizationId(organization.id);
    setOrgDraft({
      name: organization.name ?? '',
      legalName: organization.legalName ?? '',
      partnerType: organization.partnerType ?? 'logistics_company',
      status: organization.status ?? 'active',
      linkedUserId: organization.linkedUserId ?? '',
      contactName: organization.contactName ?? '',
      contactEmail: organization.contactEmail ?? '',
      contactPhone: organization.contactPhone ?? '',
      address: organization.address ?? '',
      country: organization.country ?? '',
      notes: organization.notes ?? ''
    });
  }

  function toggleOrganizationStatus(organization: Organization) {
    setEditMode(organization);
    setSelectedOrganizationId(organization.id);
    setOrgDraft((current) => ({
      ...current,
      name: organization.name ?? '',
      legalName: organization.legalName ?? '',
      partnerType: organization.partnerType ?? 'logistics_company',
      status: organization.status === 'active' ? 'inactive' : 'active',
      linkedUserId: organization.linkedUserId ?? '',
      contactName: organization.contactName ?? '',
      contactEmail: organization.contactEmail ?? '',
      contactPhone: organization.contactPhone ?? '',
      address: organization.address ?? '',
      country: organization.country ?? '',
      notes: organization.notes ?? ''
    }));
  }

  const activeOrganization = selectedTenant?.organizations.find((organization) => organization.id === selectedOrganizationId) ?? null;
  const visibleAssignments = assignments.filter(
    (assignment) => partnerFilter === 'all' || selectedTenant?.organizations.find((org) => org.id === assignment.partnerOrganizationId)?.partnerType === partnerFilter
  );

  return (
    <div className={styles.stack}>
      {tenantsState.error ? <div className={styles.errorBox}>{tenantsState.error}</div> : null}
      {rolesState.error ? <div className={styles.errorBox}>{rolesState.error}</div> : null}
      {error ? <div className={styles.errorBox}>{error}</div> : null}
      {success ? <div className={styles.successBox}>{success}</div> : null}

      <div className={styles.cardGrid}>
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Tenant</div>
          <div className={styles.field}>
            <select value={selectedTenantId} onChange={(event) => setSelectedTenantId(event.target.value)}>
              {tenantsState.data.map((tenant) => (
                <option value={tenant.id} key={tenant.id}>
                  {tenant.name} ({tenant.slug})
                </option>
              ))}
            </select>
          </div>
          <div className={styles.inlineMeta} style={{ marginTop: 12 }}>
            <span>Organizations: {tenantDetail?.organizations.length ?? 0}</span>
            <span>Linked users: {linkedUsers.length}</span>
          </div>
          <div className={styles.inlineMeta} style={{ marginTop: 12 }}>
            <span>Registry: Insurance, Surveyors, Banks</span>
            <span>Operational: Logistics, Customs</span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionTitle}>{editMode ? 'Edit partner' : 'Create partner'}</div>
          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span>Company name</span>
              <input value={orgDraft.name} onChange={(event) => setOrgDraft((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className={styles.field}>
              <span>Legal name</span>
              <input value={orgDraft.legalName} onChange={(event) => setOrgDraft((current) => ({ ...current, legalName: event.target.value }))} />
            </label>
            <label className={styles.field}>
              <span>Type</span>
              <select value={orgDraft.partnerType} onChange={(event) => setOrgDraft((current) => ({ ...current, partnerType: event.target.value }))}>
                {partnerTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Status</span>
              <select value={orgDraft.status} onChange={(event) => setOrgDraft((current) => ({ ...current, status: event.target.value }))}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>Contact name</span>
              <input value={orgDraft.contactName} onChange={(event) => setOrgDraft((current) => ({ ...current, contactName: event.target.value }))} />
            </label>
            <label className={styles.field}>
              <span>Contact email</span>
              <input value={orgDraft.contactEmail} onChange={(event) => setOrgDraft((current) => ({ ...current, contactEmail: event.target.value }))} />
            </label>
            <label className={styles.field}>
              <span>Contact phone</span>
              <input value={orgDraft.contactPhone} onChange={(event) => setOrgDraft((current) => ({ ...current, contactPhone: event.target.value }))} />
            </label>
            <label className={styles.field}>
              <span>Country</span>
              <input value={orgDraft.country} onChange={(event) => setOrgDraft((current) => ({ ...current, country: event.target.value }))} />
            </label>
            <label className={styles.field}>
              <span>Linked user</span>
              <select value={orgDraft.linkedUserId} onChange={(event) => setOrgDraft((current) => ({ ...current, linkedUserId: event.target.value }))}>
                <option value="">No linked user</option>
                {usersState.data.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email ?? user.id}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className={styles.field} style={{ marginTop: 12 }}>
            <span>Address</span>
            <textarea value={orgDraft.address} onChange={(event) => setOrgDraft((current) => ({ ...current, address: event.target.value }))} />
          </label>
          <label className={styles.field} style={{ marginTop: 12 }}>
            <span>Notes</span>
            <textarea value={orgDraft.notes} onChange={(event) => setOrgDraft((current) => ({ ...current, notes: event.target.value }))} />
          </label>
          <div className={styles.buttonRow} style={{ marginTop: 12 }}>
            <button type="button" className={styles.button} onClick={() => void saveOrganization()} disabled={saving}>
              {saving ? 'Saving...' : editMode ? 'Save partner' : 'Create partner'}
            </button>
            {editMode ? (
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={() => {
                  setEditMode(null);
                  setOrgDraft({
                    name: '',
                    legalName: '',
                    partnerType: 'logistics_company',
                    status: 'active',
                    linkedUserId: '',
                    contactName: '',
                    contactEmail: '',
                    contactPhone: '',
                    address: '',
                    country: '',
                    notes: ''
                  });
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className={styles.cardGrid}>
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionTitle}>Partners</div>
              <div className={styles.muted}>Create, edit, activate, and deactivate admin-managed partner records.</div>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search partners" />
              <select value={partnerFilter} onChange={(event) => setPartnerFilter(event.target.value)}>
                <option value="all">All partner types</option>
                {partnerTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.stack}>
            {filteredOrganizations.length ? (
              filteredOrganizations.map((organization) => (
                <div key={organization.id} className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <div className={styles.sectionTitle}>{organization.name}</div>
                      <div className={styles.muted}>
                        {organization.legalName ?? 'No legal name'} · {organization.partnerType ?? 'registry'}
                      </div>
                      <div className={styles.muted}>Linked user: {organization.linkedUser?.email ?? 'none'}</div>
                    </div>
                    <span className={`${styles.status} ${organization.status === 'active' ? styles.statusSuccess : styles.statusWarning}`}>
                      {organization.status ?? 'active'}
                    </span>
                  </div>
                  <div className={styles.inlineMeta}>
                    <span>{organization.contactName ?? 'n/a'}</span>
                    <span>{organization.contactEmail ?? 'n/a'}</span>
                    <span>{organization.contactPhone ?? 'n/a'}</span>
                  </div>
                  <div className={styles.subtle} style={{ marginTop: 8 }}>
                    {organization.address ?? 'No address'} · {organization.country ?? 'No country'} · {organization.notes ?? 'No notes'}
                  </div>
                  <div className={styles.buttonRow} style={{ marginTop: 12 }}>
                    <button type="button" className={styles.buttonSecondary} onClick={() => editOrganization(organization)}>
                      Edit
                    </button>
                    <button type="button" className={styles.buttonSecondary} onClick={() => toggleOrganizationStatus(organization)}>
                      {organization.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button type="button" className={styles.button} onClick={() => setSelectedOrganizationId(organization.id)}>
                      Select
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>No partners yet.</div>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionTitle}>Linked user accounts</div>
          {activeOrganization && ['logistics_company', 'customs_broker'].includes(activeOrganization.partnerType ?? '') ? (
            <>
              <div className={styles.subtle}>
                Create a user from the selected partner or link an existing user. Insurance companies, surveyors, and banks stay registry-only for now.
              </div>
              <div className={styles.field} style={{ marginTop: 12 }}>
                <span>Current linked user</span>
                <div>{activeOrganization.linkedUser?.email ?? 'none'}</div>
              </div>
              <div className={styles.field} style={{ marginTop: 12 }}>
                <span>Link existing user</span>
                <select value={existingUserDraft.userId} onChange={(event) => setExistingUserDraft({ userId: event.target.value })}>
                  <option value="">Select existing user</option>
                  {usersState.data.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email ?? user.id}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.buttonRow} style={{ marginTop: 12 }}>
                <button type="button" className={styles.button} onClick={() => void linkExistingUser()} disabled={saving || !existingUserDraft.userId}>
                  Link existing user
                </button>
              </div>
              <div className={styles.fieldGrid} style={{ marginTop: 12 }}>
                <label className={styles.field}>
                  <span>First name</span>
                  <input value={userDraft.firstName} onChange={(event) => setUserDraft((current) => ({ ...current, firstName: event.target.value }))} />
                </label>
                <label className={styles.field}>
                  <span>Last name</span>
                  <input value={userDraft.lastName} onChange={(event) => setUserDraft((current) => ({ ...current, lastName: event.target.value }))} />
                </label>
                <label className={styles.field}>
                  <span>Email</span>
                  <input value={userDraft.email} onChange={(event) => setUserDraft((current) => ({ ...current, email: event.target.value }))} />
                </label>
              </div>
              <div className={styles.buttonRow} style={{ marginTop: 12 }}>
                <button type="button" className={styles.button} onClick={() => void saveLinkedUser()} disabled={saving}>
                  Create user from partner
                </button>
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>Select a logistics or customs partner to create a linked user.</div>
          )}

          <div className={styles.sectionTitle} style={{ marginTop: 20 }}>
            Existing linked users
          </div>
          <div className={styles.stack} style={{ marginTop: 12 }}>
            {linkedUsers.length ? (
              linkedUsers.map((user) => (
                <div key={user.id} className={styles.row}>
                  <span className={styles.label}>{user.email ?? user.id}</span>
                  <span>{user.firstName ?? ''} {user.lastName ?? ''}</span>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>No linked users yet.</div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.cardGrid}>
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionTitle}>Assignment controls</div>
              <div className={styles.muted}>Create and reassign shipment or customs cases.</div>
            </div>
            <select value={assignmentDraft.kind} onChange={(event) => setAssignmentDraft((current) => ({ ...current, kind: event.target.value }))}>
              <option value="shipment">Shipment</option>
              <option value="customs">Customs</option>
            </select>
          </div>

          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span>Subject type</span>
              <input value={assignmentDraft.subjectType} onChange={(event) => setAssignmentDraft((current) => ({ ...current, subjectType: event.target.value }))} />
            </label>
            <label className={styles.field}>
              <span>Subject ID</span>
              <input value={assignmentDraft.subjectId} onChange={(event) => setAssignmentDraft((current) => ({ ...current, subjectId: event.target.value }))} />
            </label>
            <label className={styles.field}>
              <span>Partner organization</span>
              <select value={assignmentDraft.partnerOrganizationId} onChange={(event) => setAssignmentDraft((current) => ({ ...current, partnerOrganizationId: event.target.value }))}>
                <option value="">Not selected</option>
                {selectedTenant?.organizations
                  .filter((organization) => organization.partnerType === (assignmentDraft.kind === 'shipment' ? 'logistics_company' : 'customs_broker'))
                  .map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Partner user</span>
              <select value={assignmentDraft.partnerUserId} onChange={(event) => setAssignmentDraft((current) => ({ ...current, partnerUserId: event.target.value }))}>
                <option value="">Not selected</option>
                {linkedUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email ?? user.id}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Reference</span>
              <input value={assignmentDraft.reference} onChange={(event) => setAssignmentDraft((current) => ({ ...current, reference: event.target.value }))} />
            </label>
            <label className={styles.field}>
              <span>Status</span>
              <input value={assignmentDraft.status} onChange={(event) => setAssignmentDraft((current) => ({ ...current, status: event.target.value }))} />
            </label>
          </div>
          <label className={styles.field} style={{ marginTop: 12 }}>
            <span>Notes</span>
            <textarea value={assignmentDraft.notes} onChange={(event) => setAssignmentDraft((current) => ({ ...current, notes: event.target.value }))} />
          </label>
          <div className={styles.buttonRow} style={{ marginTop: 12 }}>
            <button type="button" className={styles.button} onClick={() => void updateAssignmentDraft()} disabled={saving}>
              {assignmentDraft.id ? 'Save assignment' : 'Create assignment'}
            </button>
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={() =>
                setAssignmentDraft({
                  id: '',
                  kind: 'shipment',
                  subjectType: '',
                  subjectId: '',
                  partnerOrganizationId: '',
                  partnerUserId: '',
                  reference: '',
                  status: '',
                  notes: ''
                })
              }
            >
              Reset
            </button>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionTitle}>Existing assignments</div>
          <div className={styles.subtle}>Click an item to load it into the assignment form for reassign or status updates.</div>
          <div className={styles.stack} style={{ marginTop: 12 }}>
            {visibleAssignments.length ? (
              visibleAssignments.map((assignment) => (
                <button
                  key={assignment.id}
                  type="button"
                  className={styles.row}
                  onClick={() =>
                    setAssignmentDraft({
                      id: assignment.id,
                      kind: assignment.kind as 'shipment' | 'customs',
                      subjectType: assignment.subjectType,
                      subjectId: assignment.subjectId,
                      partnerOrganizationId: assignment.partnerOrganizationId ?? '',
                      partnerUserId: assignment.partnerUserId ?? '',
                      reference: assignment.reference ?? '',
                      status: assignment.status ?? '',
                      notes: assignment.notes ?? ''
                    })
                  }
                >
                  <span className={styles.label}>#{assignment.reference ?? assignment.id.slice(0, 8)}</span>
                  <span>{assignment.kind}</span>
                  <span>{assignment.status}</span>
                </button>
              ))
            ) : (
              <div className={styles.emptyState}>No assignments yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
