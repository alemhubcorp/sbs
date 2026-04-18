import { RouteShell } from '../route-shell';

export default function TermsPage() {
  return (
    <RouteShell
      eyebrow="Legal"
      title="Terms of service route."
      description="The terms link is now a working destination in the footer and legal navigation."
      primary={{ label: 'Open Privacy', href: '/privacy' }}
      secondary={{ label: 'Open Cookies', href: '/cookies' }}
      cards={[
        { tag: 'Legal', title: 'Terms overview', body: 'This route keeps the site structurally complete.', href: '/privacy', foot: 'Read privacy →' },
        { tag: 'Support', title: 'Contact support', body: 'Questions can route to a working support page.', href: '/contact', foot: 'Contact support →' },
        { tag: 'Trade', title: 'Protected marketplace', body: 'The legal section stays connected to the public marketplace.', href: '/products', foot: 'Open products →' }
      ]}
    />
  );
}
