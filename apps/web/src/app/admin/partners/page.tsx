import { RouteShell } from '../../route-shell';
import { AdminPartnersBoard } from '../../admin-partners-client';

export default async function AdminPartnersPage() {
  return (
    <RouteShell
      eyebrow="Admin"
      title="Partners."
      description="Manage logistics, customs, insurance, surveyors, and bank partner records from one admin-only control surface."
      primary={{ label: 'SMTP settings', href: '/admin/settings/smtp' }}
      secondary={{ label: 'Payment ops', href: '/admin/payments' }}
    >
      <AdminPartnersBoard />
    </RouteShell>
  );
}
