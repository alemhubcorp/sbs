import { RouteShell } from '../../route-shell';
import { AdminApiConnectionsBoard } from '../../admin-api-connections-client';

export default function AdminApiConnectionsPage() {
  return (
    <RouteShell
      eyebrow="Admin"
      title="API connections and payment rails."
      description="Configure provider connections, routing, email, and fallback payment handling from one place."
      primary={{ label: 'Bank details', href: '/admin/api-connections/banks' }}
      secondary={{ label: 'Back to Admin', href: '/admin' }}
    >
      <AdminApiConnectionsBoard view="connections" />
    </RouteShell>
  );
}
