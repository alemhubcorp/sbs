import { RouteShell } from '../../route-shell';
import { AdminPaymentsBoard } from '../../admin-payments-client';

export default async function AdminPaymentsPage() {
  return (
    <RouteShell
      eyebrow="Admin"
      title="Payment operations."
      description="Control payment readiness, review manual/bank confirmations, and verify provider events without changing the marketplace architecture."
      primary={{ label: 'Review queue', href: '/admin/payments/review' }}
      secondary={{ label: 'API connections', href: '/admin/api-connections' }}
    >
      <AdminPaymentsBoard mode="list" />
    </RouteShell>
  );
}
