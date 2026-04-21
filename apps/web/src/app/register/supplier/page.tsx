import Link from 'next/link';
import { RouteShell } from '../../route-shell';
import { RegistrationForm } from '../register-client';

type SearchParams = Promise<Record<string, string | string[] | undefined> | undefined>;

function readReturnTo(searchParams?: Record<string, string | string[] | undefined>) {
  const raw = searchParams?.returnTo;
  if (
    typeof raw === 'string' &&
    raw.trim() &&
    raw.startsWith('/') &&
    !raw.startsWith('//') &&
    !raw.startsWith('/auth') &&
    !raw.startsWith('/become-')
  ) {
    return raw;
  }

  return '/dashboard';
}

export default async function SupplierRegisterPage({ searchParams }: { searchParams?: SearchParams }) {
  const resolved = (await searchParams) ?? undefined;
  const returnTo = readReturnTo(resolved);

  return (
    <RouteShell
      eyebrow="Supplier registration"
      title="Create a supplier workspace built for RFQs, deals, and payout control."
      description="Supplier accounts are created directly from this public form, then continue into the live marketplace with the same production-safe auth routing and return path."
      primary={{ label: 'Sign in', href: `/signin?returnTo=${encodeURIComponent(returnTo)}` }}
      secondary={{ label: 'Open registration menu', href: '/register' }}
      cards={[
        {
          tag: 'Flow',
          title: 'Respond to demand',
          body: 'Open the supplier workspace to manage inbound RFQs, quotes, and accepted commercial terms.',
          href: '/quotes',
          foot: 'Open quotes →'
        },
        {
          tag: 'Escrow',
          title: 'Deliver against protected funds',
          body: 'Track deals through escrow, shipping milestones, and payout release readiness without leaving the supplier cabinet.',
          href: '/deals',
          foot: 'Open deals →'
        },
        {
          tag: 'Payouts',
          title: 'Operate payout settings',
          body: 'Keep receiving details current and monitor held, releasable, and released balances in one surface.',
          href: '/supplier/payouts',
          foot: 'Open payouts →'
        }
      ]}
    >
      <div style={{ display: 'grid', gap: 16 }}>
        <RegistrationForm kind="supplier" returnTo={returnTo} />
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/register/buyer" style={{ color: '#e2e8f0' }}>
            Need a buyer account?
          </Link>
        </div>
      </div>
    </RouteShell>
  );
}
