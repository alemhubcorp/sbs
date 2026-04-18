import { getMarketplaceViewer } from '../../lib/marketplace-viewer';
import { ComplianceWorkspaceClient } from '../compliance-workspace-client';
import { RoleCabinetPage } from '../role-cabinet';
import { DashboardOverviewClient } from '../dashboard-overview-client';

export default async function DashboardPage() {
  const viewer = await getMarketplaceViewer();
  return (
    <RoleCabinetPage
      viewer={viewer}
      overview={
        viewer.role === 'guest' || viewer.role === 'admin' ? (
          <DashboardOverviewClient role={viewer.role} />
        ) : (
          <>
            <ComplianceWorkspaceClient role={viewer.role} />
            <DashboardOverviewClient role={viewer.role} />
          </>
        )
      }
    />
  );
}
