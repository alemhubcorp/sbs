import { RouteShell } from '../route-shell';

export default function HowItWorksPage() {
  return (
    <RouteShell
      eyebrow="How it works"
      title="Register, request, escrow, confirm."
      description="The homepage section is now backed by a real route so internal navigation does not stop at a hash link."
      primary={{ label: 'Open Products', href: '/products' }}
      secondary={{ label: 'Start Sign In', href: '/signin' }}
      cards={[
        { tag: '01', title: 'Register and verify', body: 'Open a real auth entry and pick the right role.', href: '/register', foot: 'Choose your account path →' },
        { tag: '02', title: 'Place a request', body: 'Browse products or jump straight into the RFQ board.', href: '/requests', foot: 'Open RFQs →' },
        { tag: '03', title: 'Escrow and release', body: 'Use the protected trade model for every deal.', href: '/deals', foot: 'See deals →' }
      ]}
    />
  );
}
