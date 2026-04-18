import { Module } from '@nestjs/common';
import { ComplianceCoreNestModule } from '../compliance-core/compliance-core.nest-module.js';
import { NotificationsCoreNestModule } from '../notifications-core/notifications-core.nest-module.js';
import { WholesaleCoreController } from './wholesale-core.controller.js';
import { WholesaleCoreRepository } from './wholesale-core.repository.js';
import { WholesaleCoreService } from './wholesale-core.service.js';

@Module({
  imports: [ComplianceCoreNestModule, NotificationsCoreNestModule],
  controllers: [WholesaleCoreController],
  providers: [WholesaleCoreRepository, WholesaleCoreService],
  exports: [WholesaleCoreService]
})
export class WholesaleCoreNestModule {}
