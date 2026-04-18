import { Module } from '@nestjs/common';
import { AuditObservabilityNestModule } from '../audit-observability/audit-observability.nest-module.js';
import { NotificationRepository } from './notification.repository.js';
import { NotificationService } from './notification.service.js';
import { EmailService } from './email.service.js';
import { NotificationsController } from './notifications-core.controller.js';

@Module({
  imports: [AuditObservabilityNestModule],
  controllers: [NotificationsController],
  providers: [NotificationRepository, NotificationService, EmailService],
  exports: [NotificationService, EmailService]
})
export class NotificationsCoreNestModule {}
