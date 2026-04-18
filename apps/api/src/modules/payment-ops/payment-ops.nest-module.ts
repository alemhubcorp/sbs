import { Module } from '@nestjs/common';
import { AdminOpsNestModule } from '../admin-ops/admin-ops.nest-module.js';
import { AuditObservabilityNestModule } from '../audit-observability/audit-observability.nest-module.js';
import { NotificationsCoreNestModule } from '../notifications-core/notifications-core.nest-module.js';
import { PaymentCoreNestModule } from '../payment-core/payment-core.nest-module.js';
import { AdminPaymentOpsController, PaymentWebhookController } from './payment-ops.controller.js';
import { PaymentOpsService } from './payment-ops.service.js';

@Module({
  imports: [AuditObservabilityNestModule, AdminOpsNestModule, PaymentCoreNestModule, NotificationsCoreNestModule],
  controllers: [AdminPaymentOpsController, PaymentWebhookController],
  providers: [PaymentOpsService],
  exports: [PaymentOpsService]
})
export class PaymentOpsNestModule {}
