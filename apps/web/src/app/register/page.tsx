import { redirect } from 'next/navigation';

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
  redirect(`/signin?mode=register&returnTo=${encodeURIComponent(returnTo)}`);
}
