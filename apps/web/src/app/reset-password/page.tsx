import { ResetPasswordClient } from './reset-password-client';

type SearchParams = Promise<Record<string, string | string[] | undefined> | undefined>;

function readSingle(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function ResetPasswordPage({ searchParams }: { searchParams?: SearchParams }) {
  const resolved = (await searchParams) ?? undefined;
  const token = readSingle(resolved?.token);

  return <ResetPasswordClient token={token} />;
}
