import { RouteShell } from '../route-shell';
import { NotificationsBoard } from '../notifications-client';

export default function NotificationsPage() {
  return (
    <RouteShell
      eyebrow="Notifications"
      title="In-app inbox and activity feed."
      description="Payment, RFQ, quote, shipment, and delivery events update here automatically."
      primary={{ label: 'Open Orders', href: '/orders' }}
      secondary={{ label: 'Open Deals', href: '/deals' }}
    >
      <NotificationsBoard />
    </RouteShell>
  );
}
