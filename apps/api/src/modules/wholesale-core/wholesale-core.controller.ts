import { Body, Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import { CurrentAuthContext } from '../../app/current-auth-context.decorator.js';
import { extractRequestAuditContext, type ApiRequestLike } from '../../app/auth-context.js';
import { RequirePermissions, RequireTenantContext } from '../../app/permissions.decorator.js';
import { WholesaleCoreService } from './wholesale-core.service.js';

@Controller('wholesale')
export class WholesaleCoreController {
  constructor(@Inject(WholesaleCoreService) private readonly wholesaleCoreService: WholesaleCoreService) {}

  @Get('rfqs')
  @RequirePermissions('wholesale.read')
  listRfqs(@CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.wholesaleCoreService.listRfqs(authContext!);
  }

  @Post('rfqs')
  @RequirePermissions('wholesale.manage')
  @RequireTenantContext()
  createRfq(
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.wholesaleCoreService.createRfq(body, extractRequestAuditContext(request), authContext!);
  }

  @Get('rfqs/:rfqId/quotes')
  @RequirePermissions('wholesale.read')
  listQuotesForRfq(@Param('rfqId') rfqId: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.wholesaleCoreService.listQuotesForRfq(rfqId, authContext!);
  }

  @Post('rfqs/:rfqId/quotes')
  @RequirePermissions('wholesale.manage')
  submitQuote(
    @Param('rfqId') rfqId: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.wholesaleCoreService.submitQuote(rfqId, body, extractRequestAuditContext(request), authContext!);
  }

  @Get('deals')
  @RequirePermissions('wholesale.read')
  listDeals(@CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.wholesaleCoreService.listDeals(authContext!);
  }

  @Get('deals/:id')
  @RequirePermissions('wholesale.read')
  getDealById(@Param('id') id: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.wholesaleCoreService.getDealById(id, authContext!);
  }

  @Get('deals/:id/room')
  @RequirePermissions('wholesale.read')
  getDealRoom(@Param('id') dealId: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.wholesaleCoreService.getDealRoomByDealId(dealId, authContext!);
  }

  @Post('quotes/:quoteId/accept')
  @RequirePermissions('wholesale.manage')
  acceptQuote(
    @Param('quoteId') quoteId: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.wholesaleCoreService.acceptQuote(quoteId, body, extractRequestAuditContext(request), authContext!);
  }
}
