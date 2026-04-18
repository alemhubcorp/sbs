import { Module } from '@nestjs/common';
import { AuditObservabilityNestModule } from '../audit-observability/audit-observability.nest-module.js';
import { ComplianceCoreNestModule } from '../compliance-core/compliance-core.nest-module.js';
import { NotificationsCoreNestModule } from '../notifications-core/notifications-core.nest-module.js';
import { PartnerOpsController } from './partner-ops.controller.js';
import { PartnerOpsRepository } from './partner-ops.repository.js';
import { PartnerOpsService } from './partner-ops.service.js';

@Module({
  imports: [AuditObservabilityNestModule, ComplianceCoreNestModule, NotificationsCoreNestModule],
  controllers: [PartnerOpsController],
  providers: [PartnerOpsRepository, PartnerOpsService],
  exports: [PartnerOpsService]
})
export class PartnerOpsNestModule {}
