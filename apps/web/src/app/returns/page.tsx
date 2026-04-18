import { RouteShell } from '../route-shell';

export default function ReturnsPage() {
  return (
    <RouteShell
      eyebrow="Returns"
      title="Return and dispute paths are now routable."
      description="The returns page keeps a clear customer-support destination in the navigation and footer."
      primary={{ label: 'Open Help Center', href: '/help-center' }}
      secondary={{ label: 'Open Deals', href: '/deals' }}
      cards={[
        { tag: 'Support', title: 'Open a support path', body: 'Return queries can move into the support surface instead of a 404.', href: '/contact', foot: 'Contact support →' },
        { tag: 'Deals', title: 'Review a deal', body: 'Disputes and order issues stay connected to the deal flow.', href: '/deals', foot: 'Open deals →' },
        { tag: 'Account', title: 'Track an order', body: 'Move from returns into order tracking with one click.', href: '/track-order', foot: 'Track order →' }
      ]}
    />
  );
}
