import { getMarketplaceViewer } from '../../lib/marketplace-viewer';
import { RouteShell } from '../route-shell';
import { RoleCabinetPage } from '../role-cabinet';
import { PartnerOperationsBoard } from '../partner-ops-client';
import { ComplianceWorkspaceClient } from '../compliance-workspace-client';

export default async function CustomsPage() {
  const viewer = await getMarketplaceViewer();

  if (viewer.role === 'customs') {
    return (
      <RoleCabinetPage
        viewer={viewer}
        overview={
          <>
            <ComplianceWorkspaceClient role="customs" />
            <PartnerOperationsBoard kind="customs" role="customs" />
          </>
        }
      />
    );
  }

  return (
    <RouteShell
      eyebrow="Customs"
      title="Customs case handling stays visible in one route."
      description="Use this customs entry point to keep clearance status, documents, and issue flags linked to the same marketplace case."
      primary={{ label: 'Open Onboarding', href: '/onboarding' }}
      secondary={{ label: 'Open Notifications', href: '/notifications' }}
      cards={[
        { tag: 'Case', title: 'Clearance updates', body: 'Track customs cases, document requests, and issue flags from one route.', href: '/notifications', foot: 'Open notifications →' },
        { tag: 'Docs', title: 'Documents', body: 'Keep customs documents close to the operational timeline.', href: '/track-order', foot: 'Open tracking →' },
        { tag: 'Control', title: 'Broker cabinet', body: 'Customs brokers can use their cabinet after sign-in.', href: '/signin?returnTo=/customs', foot: 'Sign in →' }
      ]}
    />
  );
}
