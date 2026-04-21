import { ForgotPasswordClient } from './forgot-password-client';

type SearchParams = Promise<Record<string, string | string[] | undefined> | undefined>;

function readSingle(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function normalizeReturnTo(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/auth') || value.startsWith('/become-')) {
    return '/dashboard';
  }

  return value;
}

export default async function ForgotPasswordPage({ searchParams }: { searchParams?: SearchParams }) {
  const resolved = (await searchParams) ?? undefined;
  const returnTo = normalizeReturnTo(readSingle(resolved?.returnTo));

  return <ForgotPasswordClient returnTo={returnTo} />;
}
