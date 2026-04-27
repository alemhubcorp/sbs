import { redirect } from 'next/navigation';

type SearchParams = Promise<Record<string, string | string[] | undefined> | undefined>;

function readReturnTo(searchParams?: Record<string, string | string[] | undefined>) {
  const raw = searchParams?.returnTo;
  if (typeof raw === 'string' && raw.trim() && raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/auth') && !raw.startsWith('/become-')) {
    return raw;
  }
  return '/dashboard';
}

export default async function BuyerRegisterPage({ searchParams }: { searchParams?: SearchParams }) {
  const resolved = (await searchParams) ?? undefined;
  const returnTo = readReturnTo(resolved);
  redirect(`/signin?mode=register&role=buyer&returnTo=${encodeURIComponent(returnTo)}`);
}
