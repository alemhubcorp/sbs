import { RouteShell } from '../route-shell';
import { getMarketplaceViewer } from '../../lib/marketplace-viewer';
import { RetailOrdersBoard } from '../retail-commerce-client';

export default async function OrdersPage() {
  const viewer = await getMarketplaceViewer();

  return (
    <RouteShell
      eyebrow="Orders"
      title="Order history, fulfillment, and delivery actions."
      description="Buyer, supplier, and admin all see the same order objects, but each role only gets the actions that belong to it."
      primary={{ label: 'Open Cart', href: '/cart' }}
      secondary={{ label: 'Checkout', href: '/checkout' }}
    >
      <RetailOrdersBoard viewerRole={viewer.role} />
    </RouteShell>
  );
}
