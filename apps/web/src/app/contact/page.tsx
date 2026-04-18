import { RouteShell } from '../route-shell';

export default function ContactPage() {
  return (
    <RouteShell
      eyebrow="Contact"
      title="Contact support through a real page."
      description="The contact link now points to an actual route, keeping the footer usable while the business grows."
      primary={{ label: 'Open Help Center', href: '/help-center' }}
      secondary={{ label: 'Open About', href: '/about' }}
      cards={[
        { tag: 'Email', title: 'Support email', body: 'Use the contact route as the public support entry point.', href: '/help-center', foot: 'Go back to support →' },
        { tag: 'Orders', title: 'Account issues', body: 'Order, tracking, and wishlist links now remain reachable.', href: '/orders', foot: 'Open orders →' },
        { tag: 'Auth', title: 'Sign in', body: 'If the issue is access, the auth entry is one click away.', href: '/signin', foot: 'Open sign in →' }
      ]}
    />
  );
}
