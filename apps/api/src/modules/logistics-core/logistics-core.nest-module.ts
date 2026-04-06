import { Module } from '@nestjs/common';
import { DealLogisticsController, LogisticsCoreController } from './logistics-core.controller.js';
import { LogisticsCoreRepository } from './logistics-core.repository.js';
import { LogisticsCoreService } from './logistics-core.service.js';

@Module({
  controllers: [LogisticsCoreController, DealLogisticsController],
  providers: [LogisticsCoreRepository, LogisticsCoreService],
  exports: [LogisticsCoreService]
})
export class LogisticsCoreNestModule {}
