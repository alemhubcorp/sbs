import { RouteShell } from '../route-shell';
import { getMarketplaceViewer } from '../../lib/marketplace-viewer';
import { TrackOrderBoard } from '../retail-commerce-client';

export default async function ShippingPage() {
  const viewer = await getMarketplaceViewer();

  return (
    <RouteShell
      eyebrow="Shipping"
      title="Shipping and delivery tracking"
      description="Follow order delivery status, shipping address, payment state, and fulfillment handoff from live order data."
      primary={{ label: 'Open Logistics', href: '/logistics' }}
      secondary={{ label: 'Open Deals', href: '/deals' }}
    >
      <TrackOrderBoard viewerRole={viewer.role} />
    </RouteShell>
  );
}
