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
      title="Create a buyer account."
      description="Buyers can register here, create their profile, and continue directly into the dashboard after sign-in."
      primary={{ label: 'Sign in', href: `/auth/login?returnTo=${encodeURIComponent(returnTo)}` }}
      secondary={{ label: 'Open registration menu', href: '/register' }}
    >
      <div style={{ display: 'grid', gap: 16 }}>
        <RegistrationForm kind="buyer" returnTo={returnTo} />
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/register/supplier" style={{ color: '#e2e8f0' }}>
            Need a supplier account?
          </Link>
        </div>
      </div>
    </RouteShell>
  );
}
