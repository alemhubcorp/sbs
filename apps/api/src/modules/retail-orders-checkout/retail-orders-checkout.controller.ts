import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Put, Req } from '@nestjs/common';
import { CurrentAuthContext } from '../../app/current-auth-context.decorator.js';
import { extractRequestAuditContext, type ApiRequestLike } from '../../app/auth-context.js';
import { RequirePermissions } from '../../app/permissions.decorator.js';
import { RetailOrdersCheckoutService } from './retail-orders-checkout.service.js';

@Controller('retail/orders')
@RequirePermissions('retail.read')
export class RetailOrdersCheckoutController {
  constructor(
    @Inject(RetailOrdersCheckoutService)
    private readonly retailOrdersCheckoutService: RetailOrdersCheckoutService
  ) {}

  @Get()
  listOrders(@CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.retailOrdersCheckoutService.listOrders(authContext!);
  }

  @Get('cart')
  getCart(@CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.retailOrdersCheckoutService.getCart(authContext!);
  }

  @Get('current')
  getCurrentOrder(@CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.retailOrdersCheckoutService.getCurrentOrder(authContext!);
  }

  @Get(':id')
  getOrderById(@Param('id') id: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.retailOrdersCheckoutService.getOrderById(id, authContext!);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.retailOrdersCheckoutService.getHistory(id, authContext!);
  }

  @Post()
  @RequirePermissions('retail.manage')
  createOrder(@Body() body: unknown, @Req() request: ApiRequestLike, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.retailOrdersCheckoutService.createOrder(body, extractRequestAuditContext(request), authContext!);
  }

  @Post('cart/items')
  @RequirePermissions('retail.manage')
  addItemToCart(@Body() body: unknown, @Req() request: ApiRequestLike, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.retailOrdersCheckoutService.addItemToCart(body, extractRequestAuditContext(request), authContext!);
  }

  @Put('cart/items/:itemId')
  @RequirePermissions('retail.manage')
  updateCartItem(
    @Param('itemId') itemId: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.retailOrdersCheckoutService.updateCartItem(itemId, body, extractRequestAuditContext(request), authContext!);
  }

  @Delete('cart/items/:itemId')
  @RequirePermissions('retail.manage')
  removeCartItem(
    @Param('itemId') itemId: string,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.retailOrdersCheckoutService.removeCartItem(itemId, extractRequestAuditContext(request), authContext!);
  }

  @Post(':id/checkout')
  @RequirePermissions('retail.manage')
  checkoutOrder(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.retailOrdersCheckoutService.checkoutOrder(id, body, extractRequestAuditContext(request), authContext!);
  }

  @Post(':id/pay')
  @RequirePermissions('retail.manage')
  submitPayment(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.retailOrdersCheckoutService.submitPayment(id, body, extractRequestAuditContext(request), authContext!);
  }

  @Post(':id/ship')
  @RequirePermissions('retail.manage')
  shipOrder(@Param('id') id: string, @Req() request: ApiRequestLike, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.retailOrdersCheckoutService.shipOrder(id, extractRequestAuditContext(request), authContext!);
  }

  @Post(':id/confirm')
  @RequirePermissions('retail.manage')
  confirmDelivery(@Param('id') id: string, @Req() request: ApiRequestLike, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.retailOrdersCheckoutService.confirmDelivery(id, extractRequestAuditContext(request), authContext!);
  }

  @Patch(':id/status')
  @RequirePermissions('retail.manage')
  updateOrderStatus(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.retailOrdersCheckoutService.updateOrderStatus(id, body, extractRequestAuditContext(request), authContext!);
  }
}
