import { Module } from '@nestjs/common';
import { AuditObservabilityNestModule } from '../audit-observability/audit-observability.nest-module.js';
import { NotificationsCoreNestModule } from '../notifications-core/notifications-core.nest-module.js';
import { ComplianceCoreController } from './compliance-core.controller.js';
import { ComplianceCoreService } from './compliance-core.service.js';

@Module({
  imports: [AuditObservabilityNestModule, NotificationsCoreNestModule],
  controllers: [ComplianceCoreController],
  providers: [ComplianceCoreService],
  exports: [ComplianceCoreService]
})
export class ComplianceCoreNestModule {}
