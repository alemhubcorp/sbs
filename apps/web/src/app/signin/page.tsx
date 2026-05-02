import { AuthClient } from './signin-client';

type SearchParams = Promise<Record<string, string | string[] | undefined> | undefined>;

function readSingle(value?: string | string[]) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function normalizeReturnTo(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/auth') || value.startsWith('/become-')) {
    return '/dashboard';
  }
  return value;
}

export default async function SignInPage({ searchParams }: { searchParams?: SearchParams }) {
  const resolved = (await searchParams) ?? undefined;
  const returnTo = normalizeReturnTo(readSingle(resolved?.returnTo));
  const authState = readSingle(resolved?.auth);
  const registered = readSingle(resolved?.registered);
  const email = readSingle(resolved?.email) ?? '';
  const modeParam = readSingle(resolved?.mode);
  const roleParam = readSingle(resolved?.role);

  const initialMode = modeParam === 'register' ? 'register' : 'signin';
  const initialRole =
    roleParam === 'buyer' || roleParam === 'supplier' || roleParam === 'logistics' || roleParam === 'customs'
      ? roleParam
      : null;

  return (
    <AuthClient
      returnTo={returnTo}
      authState={authState}
      registered={registered}
      initialEmail={email}
      initialMode={initialMode}
      initialRole={initialRole}
    />
  );
}
