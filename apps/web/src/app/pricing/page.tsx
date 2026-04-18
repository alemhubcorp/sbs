import { RouteShell } from '../route-shell';

export default function PricingPage() {
  return (
    <RouteShell
      eyebrow="Pricing"
      title="Transparent marketplace fees and escrow protection."
      description="The pricing route replaces the old dead section link with a live page that explains the trade flow and points users to the right entry points."
      primary={{ label: 'Open Sign In', href: '/signin' }}
      secondary={{ label: 'Become a Supplier', href: '/register/supplier' }}
      cards={[
        { tag: 'Escrow', title: 'Protected transactions', body: 'Deal-level escrow and release controls keep the trade flow safe from the first click.', href: '/how-it-works', foot: 'See how escrow works →' },
        { tag: 'Vendor', title: 'List inventory', body: 'Vendor onboarding routes through the same real auth entry and role selection.', href: '/register/supplier', foot: 'Become a vendor →' },
        { tag: 'Buyer', title: 'Request quotes', body: 'Buyers can move into RFQs and quote handling from the same public surface.', href: '/register/buyer', foot: 'Open buyer registration →' }
      ]}
    />
  );
}
