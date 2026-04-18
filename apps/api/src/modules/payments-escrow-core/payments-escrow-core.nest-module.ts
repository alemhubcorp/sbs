import { Module } from '@nestjs/common';
import { NotificationsCoreNestModule } from '../notifications-core/notifications-core.nest-module.js';
import { PaymentsEscrowCoreController } from './payments-escrow-core.controller.js';
import { PaymentsEscrowCoreRepository } from './payments-escrow-core.repository.js';
import { PaymentsEscrowCoreService } from './payments-escrow-core.service.js';

@Module({
  imports: [NotificationsCoreNestModule],
  controllers: [PaymentsEscrowCoreController],
  providers: [PaymentsEscrowCoreRepository, PaymentsEscrowCoreService],
  exports: [PaymentsEscrowCoreService]
})
export class PaymentsEscrowCoreNestModule {}
