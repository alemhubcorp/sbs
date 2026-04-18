import { RouteShell } from '../route-shell';

export default function CookiesPage() {
  return (
    <RouteShell
      eyebrow="Legal"
      title="Cookies page route."
      description="A minimal but real destination for the cookie footer link."
      primary={{ label: 'Open Privacy', href: '/privacy' }}
      secondary={{ label: 'Open Help Center', href: '/help-center' }}
      cards={[
        { tag: 'Legal', title: 'Cookie overview', body: 'The footer link is live and no longer hashes out.', href: '/privacy', foot: 'Open privacy →' },
        { tag: 'Support', title: 'Need assistance', body: 'The support area remains usable for policy questions.', href: '/help-center', foot: 'Open support →' },
        { tag: 'Account', title: 'Continue to auth', body: 'Log in or register if you need a fuller account experience.', href: '/signin', foot: 'Open auth entry →' }
      ]}
    />
  );
}
