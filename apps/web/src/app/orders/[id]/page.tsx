import { notFound } from 'next/navigation';
import { RouteShell } from '../../route-shell';
import { getMarketplaceViewer } from '../../../lib/marketplace-viewer';
import { RetailOrderDetailBoard } from '../../retail-commerce-client';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getMarketplaceViewer();

  if (!id) {
    notFound();
  }

  return (
    <RouteShell
      eyebrow="Order Detail"
      title="Track this order through payment, shipping, and delivery."
      description="History events and current lifecycle state appear together so the user can follow the trade without guessing."
      primary={{ label: 'Back to Orders', href: '/orders' }}
      secondary={{ label: 'Open Cart', href: '/cart' }}
    >
      <RetailOrderDetailBoard orderId={id} viewerRole={viewer.role} />
    </RouteShell>
  );
}
