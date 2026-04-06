import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller.js';
import { JobsController } from './jobs.controller.js';
import { ModulesController } from './modules.controller.js';
import { ModulesRegistryService } from './modules-registry.service.js';
import { InfrastructureModule } from './infrastructure.module.js';
import { loadRuntimeConfig } from '@ruflo/config';
import { AuditObservabilityNestModule } from '../modules/audit-observability/audit-observability.nest-module.js';
import { AdminCoreNestModule } from '../modules/admin-core/admin-core.nest-module.js';
import { CatalogProductNestModule } from '../modules/catalog-product/catalog-product.nest-module.js';
import { ContractCoreNestModule } from '../modules/contract-core/contract-core.nest-module.js';
import { DisputeCoreNestModule } from '../modules/dispute-core/dispute-core.nest-module.js';
import { DocumentCoreNestModule } from '../modules/document-core/document-core.nest-module.js';
import { IdentityAccessNestModule } from '../modules/identity-access/identity-access.nest-module.js';
import { LogisticsCoreNestModule } from '../modules/logistics-core/logistics-core.nest-module.js';
import { RetailOrdersCheckoutNestModule } from '../modules/retail-orders-checkout/retail-orders-checkout.nest-module.js';
import { TenantOrgNestModule } from '../modules/tenant-org/tenant-org.nest-module.js';
import { WholesaleCoreNestModule } from '../modules/wholesale-core/wholesale-core.nest-module.js';
import { PaymentsEscrowCoreNestModule } from '../modules/payments-escrow-core/payments-escrow-core.nest-module.js';

@Module({
  imports: [
    InfrastructureModule,
    AuditObservabilityNestModule,
    AdminCoreNestModule,
    IdentityAccessNestModule,
    TenantOrgNestModule,
    CatalogProductNestModule,
    RetailOrdersCheckoutNestModule,
    WholesaleCoreNestModule,
    ContractCoreNestModule,
    DocumentCoreNestModule,
    PaymentsEscrowCoreNestModule,
    DisputeCoreNestModule,
    LogisticsCoreNestModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadRuntimeConfig]
    })
  ],
  controllers: [HealthController, ModulesController, JobsController],
  providers: [ModulesRegistryService]
})
export class AppModule {}
