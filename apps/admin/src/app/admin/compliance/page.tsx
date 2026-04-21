import { redirect } from 'next/navigation';

function getWebAppUrl() {
  return (process.env.WEB_URL ?? process.env.NEXT_PUBLIC_WEB_URL ?? process.env.APP_URL ?? 'http://localhost:3001').replace(/\/$/, '');
}

export default function AdminComplianceNestedRedirectPage() {
  redirect(`${getWebAppUrl()}/compliance`);
}
