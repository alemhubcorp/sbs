import { RouteShell } from '../route-shell';

export default function TrackOrderPage() {
  return (
    <RouteShell
      eyebrow="Account"
      title="Track order route."
      description="The track order link now lands on an actual page so navigation does not fail."
      primary={{ label: 'Open Orders', href: '/orders' }}
      secondary={{ label: 'Open Help Center', href: '/help-center' }}
      cards={[
        { tag: 'Orders', title: 'Track by contract', body: 'Use the account flow to inspect live order progress.', href: '/orders', foot: 'Open orders →' },
        { tag: 'Logistics', title: 'Shipping support', body: 'Move from tracking into shipping and logistics pages.', href: '/shipping', foot: 'Open shipping →' },
        { tag: 'Support', title: 'Contact us', body: 'Support stays in the route graph instead of a dead link.', href: '/contact', foot: 'Contact support →' }
      ]}
    />
  );
}
