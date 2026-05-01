import { requireAccessToken } from '../../lib/auth';
import { ApiConnectionsBoard } from './_board';

export const dynamic = 'force-dynamic';

const internalBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

const publicApiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://alemhub.sbs/api';

type AdminSettingRow = {
  id: string;
  key: string;
  section: string;
  value: Record<string, unknown>;
  updatedAt: string;
};

export default async function ApiConnectionsPage() {
  const accessToken = await requireAccessToken('/api-connections');

  let rows: AdminSettingRow[] = [];
  try {
    const res = await fetch(`${internalBaseUrl}/api/admin/settings`, {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: 'no-store'
    });
    if (res.ok) rows = (await res.json()) as AdminSettingRow[];
  } catch {
    // page still renders — client will show error on refresh
  }

  return (
    <ApiConnectionsBoard
      view="connections"
      initialRows={rows}
      accessToken={accessToken}
      apiBase={publicApiBase}
    />
  );
}
