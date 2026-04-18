import { adminOpsModule } from './admin-ops/module.js';
import { adminCoreModule } from './admin-core/module.js';
import { agentOrchestrationModule } from './agent-orchestration/module.js';
import { aiPlatformModule } from './ai-platform/module.js';
import { auditObservabilityModule } from './audit-observability/module.js';
import { catalogProductModule } from './catalog-product/module.js';
import { contractCoreModule } from './contract-core/module.js';
import { disputeCoreModule } from './dispute-core/module.js';
import { documentCoreModule } from './document-core/module.js';
import { identityAccessModule } from './identity-access/module.js';
import { integrationHubModule } from './integration-hub/module.js';
import { logisticsCoreModule } from './logistics-core/module.js';
import { notificationsCoreModule } from './notifications-core/module.js';
import { paymentsEscrowCoreModule } from './payments-escrow-core/module.js';
import { paymentCoreModule } from './payment-core/module.js';
import { paymentOpsModule } from './payment-ops/module.js';
import { partnerOpsModule } from './partner-ops/partner-ops.module.js';
import { retailOrdersCheckoutModule } from './retail-orders-checkout/module.js';
import { tenantOrgModule } from './tenant-org/module.js';
import { wholesaleCoreModule } from './wholesale-core/module.js';

export const appModules = [
  identityAccessModule,
  tenantOrgModule,
  adminOpsModule,
  adminCoreModule,
  catalogProductModule,
  retailOrdersCheckoutModule,
  wholesaleCoreModule,
  contractCoreModule,
  documentCoreModule,
  paymentCoreModule,
  paymentOpsModule,
  partnerOpsModule,
  paymentsEscrowCoreModule,
  disputeCoreModule,
  logisticsCoreModule,
  notificationsCoreModule,
  auditObservabilityModule,
  integrationHubModule,
  aiPlatformModule,
  agentOrchestrationModule
];
