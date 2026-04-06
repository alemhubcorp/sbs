import { Module } from '@nestjs/common';
import { RetailOrdersCheckoutController } from './retail-orders-checkout.controller.js';
import { RetailOrdersCheckoutRepository } from './retail-orders-checkout.repository.js';
import { RetailOrdersCheckoutService } from './retail-orders-checkout.service.js';

@Module({
  controllers: [RetailOrdersCheckoutController],
  providers: [RetailOrdersCheckoutRepository, RetailOrdersCheckoutService]
})
export class RetailOrdersCheckoutNestModule {}
