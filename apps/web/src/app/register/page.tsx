import Link from 'next/link';
import { RouteShell } from '../route-shell';

type SearchParams = Promise<Record<string, string | string[] | undefined> | undefined>;

function normalizeReturnTo(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/auth') || raw.startsWith('/become-')) {
    return '/dashboard';
  }

  return raw;
}

export default async function RegisterPage({ searchParams }: { searchParams?: SearchParams }) {
  const resolved = (await searchParams) ?? undefined;
  const returnTo = normalizeReturnTo(resolved?.returnTo);

  return (
    <RouteShell
      eyebrow="Registration"
      title="Create a real public account."
      description="Buyers and suppliers register directly here, without dev routes or localhost auth links."
      primary={{ label: 'Buyer signup', href: `/register/buyer?returnTo=${encodeURIComponent(returnTo)}` }}
      secondary={{ label: 'Supplier signup', href: `/register/supplier?returnTo=${encodeURIComponent(returnTo)}` }}
      cards={[
        {
          tag: 'Buyer',
          title: 'Create a buyer account',
          body: 'Register to browse products, create RFQs, pay through escrow, and track orders.',
          href: `/register/buyer?returnTo=${encodeURIComponent(returnTo)}`,
          foot: 'Open buyer registration →'
        },
        {
          tag: 'Supplier',
          title: 'Create a supplier account',
          body: 'Register to manage inventory, answer RFQs, ship deals, and receive payouts.',
          href: `/register/supplier?returnTo=${encodeURIComponent(returnTo)}`,
          foot: 'Open supplier registration →'
        }
      ]}
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/signin" style={{ color: '#e2e8f0' }}>
          Already have an account? Sign in
        </Link>
      </div>
    </RouteShell>
  );
}
