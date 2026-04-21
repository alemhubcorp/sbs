import { createManagedAccountAction, updateManagedUserStatusAction } from '../actions';
import { getAdminDashboardData } from '../../lib/api';

function roleLabel(code?: string) {
  if (code === 'platform_admin') return 'Platform admin';
  if (code === 'customer_user') return 'Buyer user';
  if (code === 'supplier_user') return 'Supplier user';
  if (code === 'logistics_company') return 'Logistics';
  if (code === 'customs_broker') return 'Customs';
  return code ?? 'unknown';
}

export default async function UsersPage() {
  const dashboard = await getAdminDashboardData();
  const users = dashboard.users as Array<{
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    status?: string;
    userRoles?: Array<{ role?: { id?: string; code?: string } }>;
  }>;
  const roles = (dashboard.roles as Array<{ id?: string; code?: string }>)
    .filter((role) => ['platform_admin', 'customer_user', 'supplier_user', 'logistics_company', 'customs_broker'].includes(String(role.code ?? '')));

  return (
    <main style={{ display: 'grid', gap: 24 }}>
      <section style={{ padding: 24, borderRadius: 26, background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(148,163,184,0.18)' }}>
        <h1 style={{ margin: 0, fontSize: 28, color: '#0f172a' }}>Users and employees</h1>
        <p style={{ margin: '8px 0 0', color: '#64748b' }}>Create real authenticated accounts, assign safe roles, and toggle active state without touching the auth architecture.</p>
      </section>

      <section style={{ padding: 24, borderRadius: 26, background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(148,163,184,0.18)' }}>
        <form action={createManagedAccountAction} style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <select name="accountType" defaultValue="user">
              <option value="user">Platform user</option>
              <option value="employee">Employee</option>
            </select>
            <input name="firstName" placeholder="First name" required />
            <input name="lastName" placeholder="Last name" required />
            <input name="email" type="email" placeholder="Email" required />
            <input name="password" type="password" placeholder="Password" minLength={10} required />
            <select name="status" defaultValue="active">
              <option value="active">Active</option>
              <option value="disabled">Inactive</option>
            </select>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <strong style={{ color: '#0f172a' }}>Roles</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
              {roles.map((role) => (
                <label key={role.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" name="roleIds" value={role.id} />
                  {roleLabel(role.code)}
                </label>
              ))}
            </div>
          </div>
          <div>
            <button type="submit">Create account</button>
          </div>
        </form>
      </section>

      <section style={{ padding: 24, borderRadius: 26, background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(148,163,184,0.18)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th align="left">User</th>
              <th align="left">Status</th>
              <th align="left">Roles</th>
              <th align="left">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td style={{ padding: '12px 0' }}>
                  <div style={{ display: 'grid', gap: 4 }}>
                    <strong>{[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email}</strong>
                    <span style={{ color: '#64748b' }}>{user.email}</span>
                  </div>
                </td>
                <td>{user.status}</td>
                <td>{(user.userRoles ?? []).map((entry) => roleLabel(entry.role?.code)).join(', ') || 'No roles'}</td>
                <td>
                  {user.id ? (
                    <form action={updateManagedUserStatusAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="status" value={user.status === 'disabled' ? 'active' : 'disabled'} />
                      <button type="submit">{user.status === 'disabled' ? 'Activate' : 'Deactivate'}</button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
