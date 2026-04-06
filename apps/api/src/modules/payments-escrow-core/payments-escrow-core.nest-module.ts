import { Module } from '@nestjs/common';
import { PaymentsEscrowCoreController } from './payments-escrow-core.controller.js';
import { PaymentsEscrowCoreRepository } from './payments-escrow-core.repository.js';
import { PaymentsEscrowCoreService } from './payments-escrow-core.service.js';

@Module({
  controllers: [PaymentsEscrowCoreController],
  providers: [PaymentsEscrowCoreRepository, PaymentsEscrowCoreService],
  exports: [PaymentsEscrowCoreService]
})
export class PaymentsEscrowCoreNestModule {}
