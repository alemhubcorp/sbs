import { RouteShell } from '../route-shell';
import { getMarketplaceViewer } from '../../lib/marketplace-viewer';
import { RetailCartBoard } from '../retail-commerce-client';

export default async function CartPage() {
  const viewer = await getMarketplaceViewer();

  return (
    <RouteShell
      eyebrow="Cart"
      title="Your persistent cart."
      description="Items stay tied to the logged-in buyer session until checkout, and quantity changes persist on the server."
      primary={{ label: 'Checkout', href: '/checkout' }}
      secondary={{ label: 'Browse Products', href: '/products' }}
    >
      <RetailCartBoard viewerRole={viewer.role} />
    </RouteShell>
  );
}
