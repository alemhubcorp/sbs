import { RouteShell } from '../../../route-shell';
import { AdminPaymentsBoard } from '../../../admin-payments-client';

export default async function AdminPaymentReviewPage() {
  return (
    <RouteShell
      eyebrow="Admin"
      title="Manual payment review queue."
      description="Approve, reject, or request correction for bank/manual payment proof and webhook anomalies."
      primary={{ label: 'All payments', href: '/admin/payments' }}
      secondary={{ label: 'Banks', href: '/admin/api-connections/banks' }}
    >
      <AdminPaymentsBoard mode="review" />
    </RouteShell>
  );
}
