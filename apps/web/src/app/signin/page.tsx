import { RouteShell } from '../route-shell';

export default function SignInPage() {
  return (
    <RouteShell
      eyebrow="Auth entry"
      title="Choose a sign-in path that leads to a real auth endpoint."
      description="This page keeps the login flow visible while public registration now lives on the dedicated buyer and supplier pages."
      primary={{ label: 'Continue to Auth', href: '/auth/login?returnTo=/dashboard' }}
      secondary={{ label: 'Register', href: '/register' }}
      cards={[
        { tag: 'Buyer', title: 'Buyer sign in', body: 'Use the same auth redirect for the buyer flow and return to the dashboard.', href: '/auth/login?returnTo=/dashboard', foot: 'Open buyer auth →' },
        { tag: 'Buyer', title: 'Buyer registration', body: 'Create a public buyer account with a real form and role assignment.', href: '/register/buyer', foot: 'Open buyer registration →' },
        { tag: 'Supplier', title: 'Supplier registration', body: 'Create a public supplier account and continue into the supplier cabinet after sign-in.', href: '/register/supplier', foot: 'Open supplier registration →' }
      ]}
    />
  );
}
