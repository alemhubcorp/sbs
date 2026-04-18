import { RouteShell } from '../route-shell';

export default function AboutPage() {
  return (
    <RouteShell
      eyebrow="About"
      title="About Safe-Contract and the marketplace footprint."
      description="The about route keeps the informational footer link alive and consistent with the current site style."
      primary={{ label: 'Open Products', href: '/products' }}
      secondary={{ label: 'Open Pricing', href: '/pricing' }}
      cards={[
        { tag: 'Platform', title: 'Global marketplace', body: 'The route stays aligned with the public homepage and its protected trade model.', href: '/', foot: 'Back to homepage →' },
        { tag: 'Flow', title: 'Buyer and vendor paths', body: 'Users can move through sign in, registration, and live marketplace pages.', href: '/signin', foot: 'Open auth entry →' },
        { tag: 'Deal', title: 'Escrow-first trading', body: 'The about page points into the same workflow that the homepage promotes.', href: '/how-it-works', foot: 'See how it works →' }
      ]}
    />
  );
}
