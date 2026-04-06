import { Module } from '@nestjs/common';
import { AuditObservabilityNestModule } from '../audit-observability/audit-observability.nest-module.js';
import { ContractCoreNestModule } from '../contract-core/contract-core.nest-module.js';
import { LogisticsCoreNestModule } from '../logistics-core/logistics-core.nest-module.js';
import { PaymentsEscrowCoreNestModule } from '../payments-escrow-core/payments-escrow-core.nest-module.js';
import { WholesaleCoreNestModule } from '../wholesale-core/wholesale-core.nest-module.js';
import { AdminCoreController } from './admin-core.controller.js';
import { AdminCoreService } from './admin-core.service.js';

@Module({
  imports: [
    AuditObservabilityNestModule,
    WholesaleCoreNestModule,
    ContractCoreNestModule,
    PaymentsEscrowCoreNestModule,
    LogisticsCoreNestModule
  ],
  controllers: [AdminCoreController],
  providers: [AdminCoreService],
  exports: [AdminCoreService]
})
export class AdminCoreNestModule {}
