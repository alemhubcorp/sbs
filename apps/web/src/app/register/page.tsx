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
      title="Open a premium marketplace account on the live production route."
      description="Buyers and suppliers register directly here, then continue into the same production marketplace used for RFQs, deals, escrow tracking, logistics, and payouts."
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
          tag: 'Trust',
          title: 'Production-safe account entry',
          body: 'The signup flow uses the live domain, valid auth routing, and a clean return path into the correct post-login cabinet.',
          href: `/signin?returnTo=${encodeURIComponent(returnTo)}`,
          foot: 'Open sign in →'
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
