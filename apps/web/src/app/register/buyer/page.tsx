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

export default async function BuyerRegisterPage({ searchParams }: { searchParams?: SearchParams }) {
  const resolved = (await searchParams) ?? undefined;
  const returnTo = readReturnTo(resolved);

  return (
    <RouteShell
      eyebrow="Buyer registration"
      title="Create a buyer workspace built for sourcing, escrow, and delivery follow-up."
      description="Buyers register here, create their production profile, and continue into the live marketplace with the same secure return path used on the public domain."
      primary={{ label: 'Sign in', href: `/signin?returnTo=${encodeURIComponent(returnTo)}` }}
      secondary={{ label: 'Open registration menu', href: '/register' }}
      cards={[
        {
          tag: 'Flow',
          title: 'Source and negotiate',
          body: 'Move from catalog browsing into RFQs, supplier quotes, and deal creation from one buyer cabinet.',
          href: '/requests',
          foot: 'Open requests →'
        },
        {
          tag: 'Escrow',
          title: 'Pay with visibility',
          body: 'Track payment status, confirmations, and order history in the secure buyer flow.',
          href: '/buyer/payments',
          foot: 'Open buyer payments →'
        },
        {
          tag: 'Fulfillment',
          title: 'Track order progress',
          body: 'Keep delivery follow-up, notifications, and order status visible after checkout and deal acceptance.',
          href: '/orders',
          foot: 'Open orders →'
        }
      ]}
    >
      <div style={{ display: 'grid', gap: 16 }}>
        <RegistrationForm kind="buyer" returnTo={returnTo} />
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/register/supplier" style={{ color: 'var(--teal)' }}>
            Need a supplier account?
          </Link>
        </div>
      </div>
    </RouteShell>
  );
}
