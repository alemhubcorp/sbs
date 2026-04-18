import { Module } from '@nestjs/common';
import { NotificationsCoreNestModule } from '../notifications-core/notifications-core.nest-module.js';
import { PaymentCoreNestModule } from '../payment-core/payment-core.nest-module.js';
import { RetailOrdersCheckoutController } from './retail-orders-checkout.controller.js';
import { RetailOrdersCheckoutRepository } from './retail-orders-checkout.repository.js';
import { RetailOrdersCheckoutService } from './retail-orders-checkout.service.js';

@Module({
  imports: [PaymentCoreNestModule, NotificationsCoreNestModule],
  controllers: [RetailOrdersCheckoutController],
  providers: [RetailOrdersCheckoutRepository, RetailOrdersCheckoutService]
})
export class RetailOrdersCheckoutNestModule {}
