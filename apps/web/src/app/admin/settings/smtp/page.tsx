import { RouteShell } from '../../../route-shell';
import { AdminSmtpSettingsBoard } from '../../../admin-smtp-settings-client';

export default async function AdminSmtpSettingsPage() {
  return (
    <RouteShell
      eyebrow="Admin"
      title="SMTP settings."
      description="Configure outbound email delivery and test SMTP without breaking payments, escrow, or notifications."
      primary={{ label: 'Partners', href: '/admin/partners' }}
      secondary={{ label: 'API connections', href: '/admin/api-connections' }}
    >
      <AdminSmtpSettingsBoard />
    </RouteShell>
  );
}
