import { RouteShell } from '../route-shell';

export default function HelpCenterPage() {
  return (
    <RouteShell
      eyebrow="Support"
      title="Help center, shipping info, returns, and contact are all real routes now."
      description="Footer support links no longer collapse into '#'. They open real pages in the same Alemhub visual language."
      primary={{ label: 'Contact Us', href: '/contact' }}
      secondary={{ label: 'About Us', href: '/about' }}
      cards={[
        { tag: 'Shipping', title: 'Shipping info', body: 'Open the shipping route for the delivery path and logistics entry points.', href: '/shipping', foot: 'Open shipping →' },
        { tag: 'Returns', title: 'Returns', body: 'Return handling remains visible even while the full workflow is still maturing.', href: '/returns', foot: 'Open returns →' },
        { tag: 'Account', title: 'Order history', body: 'Move from help into account and order routes without 404s.', href: '/orders', foot: 'Open account routes →' }
      ]}
    />
  );
}
