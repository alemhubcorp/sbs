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
      title="Create your Alemhub account."
      description="Buyers and suppliers register here, then continue into the marketplace for RFQs, deals, escrow tracking, logistics, and payouts."
      primary={{ label: 'Buyer signup', href: `/register/buyer?returnTo=${encodeURIComponent(returnTo)}` }}
      secondary={{ label: 'Supplier signup', href: `/register/supplier?returnTo=${encodeURIComponent(returnTo)}` }}
      cards={[
        {
          tag: 'Buyer',
          title: 'Create a buyer account',
          body: 'Register to source products, create RFQs, manage checkout, and track escrow-backed orders from one cabinet.',
          href: `/register/buyer?returnTo=${encodeURIComponent(returnTo)}`,
          foot: 'Open buyer registration →'
        },
        {
          tag: 'Supplier',
          title: 'Create a supplier account',
          body: 'Register to answer RFQs, move accepted quotes into deals, and manage payout readiness without leaving the live marketplace.',
          href: `/register/supplier?returnTo=${encodeURIComponent(returnTo)}`,
          foot: 'Open supplier registration →'
        },
        {
          tag: 'Sign in',
          title: 'Already have an account?',
          body: 'Sign in to your existing buyer or supplier account and return to your previous flow.',
          href: `/signin?returnTo=${encodeURIComponent(returnTo)}`,
          foot: 'Open sign in →'
        }
      ]}
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/signin" style={{ color: 'var(--teal)' }}>
          Already have an account? Sign in
        </Link>
      </div>
    </RouteShell>
  );
}
