import { RouteShell } from '../route-shell';

export default function PrivacyPage() {
  return (
    <RouteShell
      eyebrow="Legal"
      title="Privacy policy route."
      description="The privacy link now opens a real page instead of a dead footer item."
      primary={{ label: 'Open Terms', href: '/terms' }}
      secondary={{ label: 'Open Cookies', href: '/cookies' }}
      cards={[
        { tag: 'Legal', title: 'Privacy overview', body: 'This placeholder keeps the legal surface reachable.', href: '/terms', foot: 'Read terms →' },
        { tag: 'Support', title: 'Help center', body: 'If the policy raises questions, support is one click away.', href: '/help-center', foot: 'Open support →' },
        { tag: 'Account', title: 'Sign in', body: 'Access-related questions can move to the auth entry page.', href: '/signin', foot: 'Open sign in →' }
      ]}
    />
  );
}
