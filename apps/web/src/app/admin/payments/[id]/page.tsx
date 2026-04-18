import { RouteShell } from '../../../route-shell';
import { AdminPaymentsBoard } from '../../../admin-payments-client';

export default async function AdminPaymentDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <RouteShell
      eyebrow="Admin"
      title="Payment detail."
      description="Review payment attempts, webhook events, invoice context, and sync state from the backend truth source."
      primary={{ label: 'Review queue', href: '/admin/payments/review' }}
      secondary={{ label: 'All payments', href: '/admin/payments' }}
    >
      <AdminPaymentsBoard mode="detail" paymentId={id} />
    </RouteShell>
  );
}
