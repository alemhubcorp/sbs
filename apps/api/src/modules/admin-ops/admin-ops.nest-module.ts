import { Module } from '@nestjs/common';
import { AuditObservabilityNestModule } from '../audit-observability/audit-observability.nest-module.js';
import { NotificationsCoreNestModule } from '../notifications-core/notifications-core.nest-module.js';
import { AdminOpsController, EmailSettingsController, PlatformOpsController } from './admin-ops.controller.js';
import { AdminOpsRepository } from './admin-ops.repository.js';
import { AdminOpsService } from './admin-ops.service.js';

@Module({
  imports: [AuditObservabilityNestModule, NotificationsCoreNestModule],
  controllers: [AdminOpsController, EmailSettingsController, PlatformOpsController],
  providers: [AdminOpsRepository, AdminOpsService],
  exports: [AdminOpsService, AdminOpsRepository]
})
export class AdminOpsNestModule {}
