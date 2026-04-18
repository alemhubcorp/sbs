import { Module } from '@nestjs/common';
import { NotificationsCoreNestModule } from '../notifications-core/notifications-core.nest-module.js';
import { PaymentCoreNestModule } from '../payment-core/payment-core.nest-module.js';
import { ContractCoreController } from './contract-core.controller.js';
import { ContractCoreRepository } from './contract-core.repository.js';
import { ContractCoreService } from './contract-core.service.js';

@Module({
  imports: [PaymentCoreNestModule, NotificationsCoreNestModule],
  controllers: [ContractCoreController],
  providers: [ContractCoreRepository, ContractCoreService],
  exports: [ContractCoreService]
})
export class ContractCoreNestModule {}
