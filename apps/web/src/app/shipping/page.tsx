import { RouteShell } from '../route-shell';

export default function ShippingPage() {
  return (
    <RouteShell
      eyebrow="Shipping"
      title="Shipping information stays visible and reachable."
      description="The shipping link in the footer now opens a proper route with the marketplace style and the right next actions."
      primary={{ label: 'Open Logistics', href: '/logistics' }}
      secondary={{ label: 'Open Deals', href: '/deals' }}
      cards={[
        { tag: 'Rail', title: 'Freight planning', body: 'Connect shipping to the logistics section of the app.', href: '/logistics', foot: 'Open logistics →' },
        { tag: 'Orders', title: 'Track delivery', body: 'Delivery tracking is available as an actual page route.', href: '/track-order', foot: 'Track order →' },
        { tag: 'Help', title: 'Contact support', body: 'Move directly to support without landing on a dead button.', href: '/contact', foot: 'Contact support →' }
      ]}
    />
  );
}
