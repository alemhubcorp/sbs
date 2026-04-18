import { RouteShell } from '../route-shell';

export default function WishlistPage() {
  return (
    <RouteShell
      eyebrow="Account"
      title="Wishlist route."
      description="The wishlist footer link now points to a real page."
      primary={{ label: 'Open Products', href: '/products' }}
      secondary={{ label: 'Open Categories', href: '/categories' }}
      cards={[
        { tag: 'Browse', title: 'Save products', body: 'Keep product discovery in the same visible marketplace surface.', href: '/products', foot: 'Browse products →' },
        { tag: 'Trade', title: 'Open RFQs', body: 'Saved items can move into requests and quotes without dead ends.', href: '/requests', foot: 'Open RFQ board →' },
        { tag: 'Auth', title: 'Sign in', body: 'Account actions still lead to the real login entry.', href: '/signin', foot: 'Open sign in →' }
      ]}
    />
  );
}
