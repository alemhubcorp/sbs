import { notFound } from 'next/navigation';
import { RouteShell } from '../../../route-shell';
import { RetailOrderPaymentBoard } from '../../../payment-presentations-client';

export default async function OrderPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  return (
    <RouteShell
      eyebrow="Payment"
      title="Complete payment for this order."
      description="Choose a payment rail, submit the card form, or review bank/manual instructions while the backend tracks the real payment status."
      primary={{ label: 'Back to Order', href: `/orders/${id}` }}
      secondary={{ label: 'Orders', href: '/orders' }}
    >
      <RetailOrderPaymentBoard orderId={id} />
    </RouteShell>
  );
}
