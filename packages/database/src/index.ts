import { PrismaClient } from '@prisma/client';

export const prismaManagedAreas = [
  'identity-access',
  'tenant-org',
  'admin-core',
  'catalog-product',
  'retail-orders-checkout',
  'wholesale-core',
  'contract-core',
  'document-core',
  'dispute-core',
  'notifications-core',
  'integration-hub',
  'ai-platform',
  'agent-orchestration'
] as const;

export function createPrismaClient() {
  return new PrismaClient();
}
