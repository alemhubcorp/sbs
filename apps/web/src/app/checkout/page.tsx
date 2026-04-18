import { RouteShell } from '../route-shell';
import { getMarketplaceViewer } from '../../lib/marketplace-viewer';
import { RetailCheckoutBoard } from '../retail-commerce-client';

export default async function CheckoutPage() {
  const viewer = await getMarketplaceViewer();

  return (
    <RouteShell
      eyebrow="Checkout"
      title="Address, payment, and order placement."
      description="The checkout step captures shipping details and payment instructions, then waits for confirmation before the order can ship."
      primary={{ label: 'Open Cart', href: '/cart' }}
      secondary={{ label: 'Orders', href: '/orders' }}
    >
      <RetailCheckoutBoard viewerRole={viewer.role} />
    </RouteShell>
  );
}
