import { Body, Controller, Get, Inject, Param, Post, Put, Req } from '@nestjs/common';
import { extractRequestAuditContext, type ApiRequestLike } from '../../app/auth-context.js';
import { RequirePermissions } from '../../app/permissions.decorator.js';
import { RetailOrdersCheckoutService } from './retail-orders-checkout.service.js';

@Controller('retail/orders')
export class RetailOrdersCheckoutController {
  constructor(
    @Inject(RetailOrdersCheckoutService)
    private readonly retailOrdersCheckoutService: RetailOrdersCheckoutService
  ) {}

  @Get()
  @RequirePermissions('retail.read')
  listOrders() {
    return this.retailOrdersCheckoutService.listOrders();
  }

  @Get(':id')
  @RequirePermissions('retail.read')
  getOrderById(@Param('id') id: string) {
    return this.retailOrdersCheckoutService.getOrderById(id);
  }

  @Post()
  @RequirePermissions('retail.manage')
  createOrder(@Body() body: unknown, @Req() request: ApiRequestLike) {
    return this.retailOrdersCheckoutService.createOrder(body, extractRequestAuditContext(request));
  }

  @Put(':id/status')
  @RequirePermissions('retail.manage')
  updateOrderStatus(@Param('id') id: string, @Body() body: unknown, @Req() request: ApiRequestLike) {
    return this.retailOrdersCheckoutService.updateOrderStatus(id, body, extractRequestAuditContext(request));
  }
}
