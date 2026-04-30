import type { CSSProperties } from 'react';
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

const sectionGrid = (columns: string): CSSProperties => {
  let gridTemplateColumns = columns;

  if (columns === 'repeat(4, minmax(0, 1fr))') {
    gridTemplateColumns = 'repeat(auto-fit, minmax(180px, 1fr))';
  } else if (columns === 'repeat(3, minmax(0, 1fr))') {
    gridTemplateColumns = 'repeat(auto-fit, minmax(240px, 1fr))';
  } else if (columns === 'repeat(2, minmax(0, 1fr))' || columns === '2fr 1fr') {
    gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))';
  }

  return {
    display: 'grid',
    gridTemplateColumns,
    gap: 18
  };
};

const panelStyle: CSSProperties = {
  padding: 20,
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
};

const accentPanelStyle: CSSProperties = {
  ...panelStyle,
  background: '#f0fdf4',
  border: '1px solid #bbf7d0'
};

const tonePanelStyle: CSSProperties = {
  ...panelStyle,
  background: '#f8fafc',
  border: '1px solid #e2e8f0'
};

const metricValueStyle: CSSProperties = {
  fontSize: 28,
  lineHeight: 1,
  margin: '8px 0 4px',
  fontWeight: 700,
  letterSpacing: '-0.03em',
  color: '#0f172a'
};

const cardTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 10,
  color: '#0f172a'
};

const eyebrowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  width: 'fit-content',
  padding: '8px 12px',
  borderRadius: 999,
  background: 'rgba(255, 255, 255, 0.82)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  fontSize: 12,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#0f766e'
};

const sectionLeadStyle: CSSProperties = {
  marginTop: 0,
  color: '#64748b',
  lineHeight: 1.7
};

export default async function AdminHomePage() {
  const keycloakRealm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM ?? 'ruflo';
  const dashboard = await getAdminDashboardData();
  const dashboardExtras = dashboard as typeof dashboard & {
    notifications?: unknown[];
    auditEvents?: unknown[];
  };
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
  const notifications = (dashboardExtras.notifications ?? []) as Array<{
    id?: string;
    userId?: string;
    type?: string;
    title?: string;
    message?: string;
    read?: boolean;
    createdAt?: string;
  }>;
  const auditEvents = (dashboardExtras.auditEvents ?? []) as Array<{
    id?: string;
    module?: string;
    eventType?: string;
    subjectType?: string | null;
    subjectId?: string | null;
    actorId?: string | null;
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
  const pendingApprovals = approvals.filter((approval) => approval.status !== 'approved').length;
  const openDisputes = disputes.filter((dispute) => dispute.status !== 'resolved' && dispute.status !== 'closed').length;
  const activeDeals = wholesaleDeals.filter((deal) => deal.status !== 'cancelled' && deal.status !== 'closed').length;
  const escrowExposure = paymentTransactions.reduce((sum, transaction) => sum + (transaction.heldAmountMinor ?? 0), 0);
  const logisticsActive = logisticsProviders.filter((provider) => provider.status === 'active').length;

  return (
    <section className="admin-dashboard" style={{ display: 'grid', gap: 20, padding: '24px clamp(16px,2.5vw,32px)' }}>
      <style>{`
        .admin-dashboard {
          color: #334155;
        }

        .admin-dashboard section[id],
        .admin-dashboard div[id] {
          scroll-margin-top: 24px;
        }

        .admin-dashboard a {
          color: #0f766e;
          text-decoration: none;
        }

        .admin-dashboard a:hover {
          color: #0f172a;
        }

        .admin-dashboard nav a {
          display: inline-flex;
          align-items: center;
          min-height: 40px;
          padding: 0 16px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.84);
          border: 1px solid rgba(148, 163, 184, 0.18);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.05);
          font-weight: 600;
        }

        .admin-dashboard form {
          display: grid;
          gap: 10px;
          padding: 16px;
          border-radius: 20px;
          background: linear-gradient(180deg, rgba(248, 250, 252, 0.9) 0%, rgba(255, 255, 255, 0.72) 100%);
          border: 1px solid rgba(148, 163, 184, 0.14);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
        }

        .admin-dashboard input,
        .admin-dashboard select,
        .admin-dashboard textarea,
        .admin-dashboard button {
          width: 100%;
          box-sizing: border-box;
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          padding: 12px 14px;
          font: inherit;
          transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
        }

        .admin-dashboard input,
        .admin-dashboard select,
        .admin-dashboard textarea {
          background: rgba(255, 255, 255, 0.92);
          color: #0f172a;
          box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.04);
        }

        .admin-dashboard input:focus,
        .admin-dashboard select:focus,
        .admin-dashboard textarea:focus {
          outline: none;
          border-color: rgba(15, 118, 110, 0.5);
          box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.12);
        }

        .admin-dashboard button {
          background: linear-gradient(135deg, #0f766e 0%, #14532d 100%);
          color: #f8fafc;
          border: none;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 12px 24px rgba(20, 83, 45, 0.18);
        }

        .admin-dashboard button:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 30px rgba(20, 83, 45, 0.22);
        }

        .admin-dashboard pre,
        .admin-dashboard code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        }

        .admin-dashboard ul {
          color: #475569;
          line-height: 1.7;
        }

        .admin-dashboard li + li {
          margin-top: 8px;
        }

        .admin-dashboard h2 {
          color: #0f172a;
          letter-spacing: -0.03em;
        }

        .admin-dashboard h3 {
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .admin-dashboard article {
          position: relative;
          overflow: hidden;
        }

        .admin-dashboard article::before {
          content: '';
          position: absolute;
          inset: 0 auto auto 0;
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, rgba(15, 118, 110, 0.22), rgba(15, 23, 42, 0));
          pointer-events: none;
        }

        .admin-dashboard [data-kpi-grid] article p:last-child,
        .admin-dashboard [data-kpi-grid] article div:last-child {
          color: #64748b;
        }

        @media (max-width: 1100px) {
          .admin-dashboard [data-grid="triple"],
          .admin-dashboard [data-grid="double"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* ── Page header ───────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#0f172a' }}>Dashboard</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
            Logged in as <strong>{authContext?.email ?? authContext?.username ?? 'admin'}</strong> · Realm: {keycloakRealm}
          </p>
        </div>
        <form action="/admin/auth/logout" method="post">
          <button type="submit" style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#334155', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
            Logout
          </button>
        </form>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
        {[
          { icon: '📦', label: 'Active Deals', value: activeDeals, sub: 'Live wholesale deals' },
          { icon: '💰', label: 'Escrow Held', value: `$${(escrowExposure / 100).toFixed(0)}`, sub: 'In escrow accounts' },
          { icon: '⚠️', label: 'Pending Approvals', value: pendingApprovals, sub: 'Require action' },
          { icon: '🚚', label: 'Active Logistics', value: logisticsActive, sub: 'Active providers' },
          { icon: '⚡', label: 'Open Disputes', value: openDisputes, sub: 'Under review' },
          { icon: '👤', label: 'Users', value: Array.isArray(dashboard.users) ? dashboard.users.length : 0, sub: 'Registered accounts' }
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 20 }}>{kpi.icon}</div>
            <div style={{ marginTop: 10, fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: '#0f172a' }}>{kpi.value}</div>
            <div style={{ marginTop: 2, fontSize: 13, fontWeight: 600, color: '#334155' }}>{kpi.label}</div>
            <div style={{ marginTop: 2, fontSize: 11, color: '#94a3b8' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Quick nav ─────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 10 }}>Jump to section</div>
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[
            ['#identity','Identity'],['#catalog','Catalog'],['#wholesale','Wholesale'],
            ['#contracts','Contracts'],['#payments','Payments'],['#logistics','Logistics'],
            ['#approvals','Approvals'],['#ops','Audit Log']
          ].map(([href, label]) => (
            <a key={href} href={href} style={{ padding: '5px 12px', borderRadius: 6, background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: 12, color: '#475569', fontWeight: 500, textDecoration: 'none' }}>{label}</a>
          ))}
        </nav>
      </div>

      <section style={{ display: 'grid', gap: 20 }}>

          <div data-grid="triple" data-kpi-grid="true" style={sectionGrid('repeat(4, minmax(0, 1fr))')}>
            <article style={panelStyle}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#64748b' }}>
                Active Deals
              </div>
              <p style={metricValueStyle}>{activeDeals}</p>
              <p style={{ margin: 0 }}>Live wholesale deals still in motion.</p>
            </article>
            <article style={panelStyle}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#64748b' }}>
                Logistics Ready
              </div>
              <p style={metricValueStyle}>{logisticsActive}</p>
              <p style={{ margin: 0 }}>Providers currently marked active.</p>
            </article>
            <article style={accentPanelStyle}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#0f766e' }}>
                Open Disputes
              </div>
              <p style={metricValueStyle}>{openDisputes}</p>
              <p style={{ margin: 0 }}>Cases that still need an operator decision.</p>
            </article>
            <article style={tonePanelStyle}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#64748b' }}>
                Escrow Held
              </div>
              <p style={metricValueStyle}>${(escrowExposure / 100).toFixed(2)}</p>
              <p style={{ margin: 0 }}>Funds preserved inside protected flows.</p>
            </article>
          </div>

          <div data-grid="double" style={sectionGrid('2fr 1fr')}>
        <article style={panelStyle}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#64748b' }}>
            Executive focus
          </div>
          <p style={{ margin: '12px 0 0', lineHeight: 1.8, color: '#475569' }}>
            Control sensitive marketplace motion across identity, approvals, payments, and logistics. This page now
            emphasizes exception handling and live operating posture instead of exposing a flat wall of forms.
          </p>
        </article>
        <article style={accentPanelStyle}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#0f766e' }}>
            Escrow posture
          </div>
          <p style={{ margin: '12px 0 0', lineHeight: 1.8, color: '#475569' }}>
            Funds on hold: <strong>${(escrowExposure / 100).toFixed(2)}</strong>. Open disputes: <strong>{openDisputes}</strong>.
            Validate releases against the payments section before moving funds.
          </p>
        </article>
          </div>
      </section>

      <div id="identity" data-grid="triple" style={sectionGrid('repeat(4, minmax(0, 1fr))')}>
        <article style={tonePanelStyle}>
          <h2 style={cardTitleStyle}>API Health</h2>
          <p style={sectionLeadStyle}>Operational heartbeat from the live backend.</p>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>
            {JSON.stringify(dashboard.health, null, 2)}
          </pre>
        </article>
        <article style={panelStyle}>
          <h2 style={cardTitleStyle}>Tenants</h2>
          <p style={metricValueStyle}>{dashboard.tenants.length}</p>
          <p style={{ marginBottom: 0 }}>Live list from <code>/api/tenants</code></p>
        </article>
        <article style={panelStyle}>
          <h2 style={cardTitleStyle}>Users</h2>
          <p style={metricValueStyle}>{dashboard.users.length}</p>
          <p style={{ marginBottom: 0 }}>Live list from <code>/api/identity/users</code></p>
        </article>
        <article style={accentPanelStyle}>
          <h2 style={cardTitleStyle}>Pending Approvals</h2>
          <p style={metricValueStyle}>{pendingApprovals}</p>
          <p style={{ marginBottom: 0 }}>Critical actions are routed through <code>/api/admin/approvals</code></p>
        </article>
      </div>

      <div data-grid="double" style={sectionGrid('repeat(2, minmax(0, 1fr))')}>
        <article style={panelStyle}>
          <h2 style={cardTitleStyle}>Recent Tenants</h2>
          <p style={sectionLeadStyle}>Latest tenant records currently surfaced to the console.</p>
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
        <article style={panelStyle}>
          <h2 style={cardTitleStyle}>Recent Users</h2>
          <p style={sectionLeadStyle}>Recent identity records from the current runtime.</p>
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

      <div id="approvals" data-grid="double" style={sectionGrid('repeat(2, minmax(0, 1fr))')}>
        <article style={panelStyle}>
          <h2 style={{ marginTop: 0 }}>Approval Queue</h2>
          <p style={sectionLeadStyle}>Pending actions that affect access, movement, or compliance posture.</p>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {approvals.length === 0 ? <li>No pending approvals.</li> : null}
            {approvals.slice(0, 10).map((approval) => (
              <li key={approval.id}>
                {approval.module} / {approval.approvalType} [{approval.status}] {approval.subjectType}:{approval.subjectId}
              </li>
            ))}
          </ul>
        </article>
        <article style={panelStyle}>
          <h2 style={{ marginTop: 0 }}>Approval Actions</h2>
          <p style={sectionLeadStyle}>Operator controls for resolving approval records.</p>
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

      <div id="ops" data-grid="double" style={sectionGrid('repeat(2, minmax(0, 1fr))')}>
        <article style={tonePanelStyle}>
          <h2 style={{ marginTop: 0 }}>Notifications</h2>
          <p style={sectionLeadStyle}>Recent in-app notifications and system messages.</p>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {notifications.length === 0 ? <li>No notifications yet.</li> : null}
            {notifications.slice(0, 8).map((notification) => (
              <li key={notification.id}>
                {notification.title} [{notification.type}] {notification.read ? 'read' : 'unread'}
              </li>
            ))}
          </ul>
        </article>
        <article style={tonePanelStyle}>
          <h2 style={{ marginTop: 0 }}>Audit Trail</h2>
          <p style={sectionLeadStyle}>Backend append-only event log.</p>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {auditEvents.length === 0 ? <li>No audit events yet.</li> : null}
            {auditEvents.slice(0, 8).map((event) => (
              <li key={event.id}>
                {event.module} / {event.eventType} [{event.subjectType ?? 'n/a'}:{event.subjectId ?? 'n/a'}]
              </li>
            ))}
          </ul>
        </article>
      </div>

      <div id="catalog" data-grid="triple" style={sectionGrid('repeat(3, minmax(0, 1fr))')}>
        <article style={panelStyle}>
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

        <article style={panelStyle}>
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

        <article style={panelStyle}>
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

      <div id="wholesale" data-grid="triple" style={sectionGrid('repeat(3, minmax(0, 1fr))')}>
        <article style={panelStyle}>
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

        <article style={panelStyle}>
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

        <article style={panelStyle}>
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

      <div data-grid="double" style={sectionGrid('repeat(2, minmax(0, 1fr))')}>
        <article style={panelStyle}>
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
        <article style={panelStyle}>
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

      <div data-grid="double" style={sectionGrid('repeat(2, minmax(0, 1fr))')}>
        <article style={panelStyle}>
          <h2 style={{ marginTop: 0 }}>Catalog Snapshot</h2>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {categoryOptions.slice(0, 5).map((category) => (
              <li key={category.id}>
                {category.name} ({category.slug})
              </li>
            ))}
          </ul>
        </article>
        <article style={panelStyle}>
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

      <article style={panelStyle}>
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

      <div id="contracts" data-grid="triple" style={sectionGrid('repeat(3, minmax(0, 1fr))')}>
        <article style={tonePanelStyle}>
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

        <article style={tonePanelStyle}>
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

        <article style={tonePanelStyle}>
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
                  background: 'rgba(255, 255, 255, 0.8)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: 18
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

      <div data-grid="triple" style={sectionGrid('repeat(3, minmax(0, 1fr))')}>
        <article style={tonePanelStyle}>
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

        <article style={tonePanelStyle}>
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

        <article style={tonePanelStyle}>
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

      <div id="payments" data-grid="triple" style={sectionGrid('repeat(3, minmax(0, 1fr))')}>
        <article style={accentPanelStyle}>
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

        <article style={accentPanelStyle}>
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

        <article style={accentPanelStyle}>
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

      <div id="logistics" data-grid="triple" style={sectionGrid('repeat(3, minmax(0, 1fr))')}>
        <article style={accentPanelStyle}>
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

        <article style={accentPanelStyle}>
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

        <article style={accentPanelStyle}>
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
