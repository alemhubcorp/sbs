import { getMarketplaceViewer } from '../../lib/marketplace-viewer';
import { RouteShell } from '../route-shell';
import { RoleCabinetPage } from '../role-cabinet';
import { PartnerOperationsBoard } from '../partner-ops-client';
import { ComplianceWorkspaceClient } from '../compliance-workspace-client';

export default async function LogisticsPage() {
  const viewer = await getMarketplaceViewer();

  if (viewer.role === 'logistics') {
    return (
      <RoleCabinetPage
        viewer={viewer}
        overview={
          <>
            <ComplianceWorkspaceClient role="logistics" />
            <PartnerOperationsBoard kind="shipment" role="logistics" />
          </>
        }
      />
    );
  }

  return (
    <RouteShell
      eyebrow="Logistics"
      title="Rail, sea, and road logistics stay on one working route."
      description="Use this logistics entry point to reach pricing, shipment tracking, and deal-linked fulfillment paths without leaving the marketplace."
      primary={{ label: 'Open Pricing', href: '/pricing' }}
      secondary={{ label: 'Open Deals', href: '/deals' }}
      cards={[
        { tag: 'Route', title: 'Shipping pricing', body: 'Open the pricing path for freight and operational settlement flows.', href: '/pricing', foot: 'See pricing →' },
        { tag: 'Control', title: 'Track fulfillment', body: 'Track order movement, shipment progress, and delivery confirmation.', href: '/track-order', foot: 'Track an order →' },
        { tag: 'Escrow', title: 'Protected release', body: 'Keep logistics milestones tied to the same deal and escrow lifecycle.', href: '/how-it-works', foot: 'See deal flow →' }
      ]}
    />
  );
}
