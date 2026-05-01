import { RouteShell } from '../route-shell';
import { getMarketplaceViewer } from '../../lib/marketplace-viewer';
import { TrackOrderBoard } from '../retail-commerce-client';

export default async function TrackOrderPage() {
  const viewer = await getMarketplaceViewer();

  return (
    <RouteShell
      eyebrow="Account"
      title="Track order"
      description="Search the orders visible to your role and follow payment, shipping, and delivery status from one place."
      primary={{ label: 'Open Orders', href: '/orders' }}
      secondary={{ label: 'Open Help Center', href: '/help-center' }}
    >
      <TrackOrderBoard viewerRole={viewer.role} />
    </RouteShell>
  );
}
