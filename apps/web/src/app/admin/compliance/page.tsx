import { getMarketplaceViewer } from '../../../lib/marketplace-viewer';
import { AdminComplianceBoard } from '../../admin-compliance-client';
import { RoleCabinetPage } from '../../role-cabinet';

export default async function AdminCompliancePage() {
  const viewer = await getMarketplaceViewer();
  return <RoleCabinetPage viewer={viewer} variant="admin" overview={<AdminComplianceBoard />} />;
}
