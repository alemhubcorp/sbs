import { Body, Controller, Get, Inject, Param, Post, Put, Req } from '@nestjs/common';
import { CurrentAuthContext } from '../../app/current-auth-context.decorator.js';
import { extractRequestAuditContext, type ApiRequestLike } from '../../app/auth-context.js';
import { RequirePermissions } from '../../app/permissions.decorator.js';
import { LogisticsCoreService } from './logistics-core.service.js';

@Controller('logistics')
@RequirePermissions('logistics.read')
export class LogisticsCoreController {
  constructor(@Inject(LogisticsCoreService) private readonly logisticsCoreService: LogisticsCoreService) {}

  @Get('providers')
  listProviders(@CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.logisticsCoreService.listProviders(authContext!);
  }

  @Get('providers/:id')
  getProviderById(@Param('id') id: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.logisticsCoreService.getProviderById(id, authContext!);
  }

  @Post('providers')
  @RequirePermissions('logistics.manage')
  createProvider(@Body() body: unknown, @Req() request: ApiRequestLike) {
    return this.logisticsCoreService.createProvider(body, extractRequestAuditContext(request));
  }

  @Put('providers/:id/status')
  @RequirePermissions('logistics.manage')
  updateProviderStatus(@Param('id') id: string, @Body() body: unknown, @Req() request: ApiRequestLike) {
    return this.logisticsCoreService.updateProviderStatus(id, body, extractRequestAuditContext(request));
  }

  @Put('providers/:id/capability-profile')
  @RequirePermissions('logistics.manage')
  upsertCapabilityProfile(@Param('id') id: string, @Body() body: unknown, @Req() request: ApiRequestLike) {
    return this.logisticsCoreService.upsertCapabilityProfile(id, body, extractRequestAuditContext(request));
  }
}

@Controller('wholesale/deals')
@RequirePermissions('logistics.read')
export class DealLogisticsController {
  constructor(@Inject(LogisticsCoreService) private readonly logisticsCoreService: LogisticsCoreService) {}

  @Get(':id/logistics-selection')
  getDealSelection(@Param('id') id: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.logisticsCoreService.getDealSelection(id, authContext!);
  }

  @Post(':id/logistics-selection')
  @RequirePermissions('logistics.manage')
  selectProvider(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.logisticsCoreService.selectProviderForDeal(id, body, extractRequestAuditContext(request), authContext!);
  }
}
