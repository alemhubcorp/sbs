import { Module } from '@nestjs/common';
import { AdminOpsNestModule } from '../admin-ops/admin-ops.nest-module.js';
import { PaymentCoreRepository } from './payment-core.repository.js';
import { PaymentCoreService } from './payment-core.service.js';

@Module({
  imports: [AdminOpsNestModule],
  providers: [PaymentCoreRepository, PaymentCoreService],
  exports: [PaymentCoreService, PaymentCoreRepository]
})
export class PaymentCoreNestModule {}
