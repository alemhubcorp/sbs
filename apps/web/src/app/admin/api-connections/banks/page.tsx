import { RouteShell } from '../../../route-shell';
import { AdminApiConnectionsBoard } from '../../../admin-api-connections-client';

export default function AdminApiConnectionsBanksPage() {
  return (
    <RouteShell
      eyebrow="Admin"
      title="Bank receiving and invoice data."
      description="Update platform receiving details, manual payment instructions, and compliance text used in invoices."
      primary={{ label: 'Provider connections', href: '/admin/api-connections' }}
      secondary={{ label: 'Back to Admin', href: '/admin' }}
    >
      <AdminApiConnectionsBoard view="banks" />
    </RouteShell>
  );
}
