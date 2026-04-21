import { Module } from '@nestjs/common';
import { AdminOpsNestModule } from '../admin-ops/admin-ops.nest-module.js';
import { NotificationsCoreNestModule } from '../notifications-core/notifications-core.nest-module.js';
import { PaymentCoreNestModule } from '../payment-core/payment-core.nest-module.js';
import { ContractCoreController } from './contract-core.controller.js';
import { ContractCoreRepository } from './contract-core.repository.js';
import { ContractCoreService } from './contract-core.service.js';

@Module({
  imports: [PaymentCoreNestModule, NotificationsCoreNestModule, AdminOpsNestModule],
  controllers: [ContractCoreController],
  providers: [ContractCoreRepository, ContractCoreService],
  exports: [ContractCoreService]
})
export class ContractCoreNestModule {}
