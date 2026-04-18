import { Body, Controller, Get, Inject, Param, Post, Put, Query, Req } from '@nestjs/common';
import { CurrentAuthContext } from '../../app/current-auth-context.decorator.js';
import { extractRequestAuditContext, type ApiRequestLike } from '../../app/auth-context.js';
import { RequirePermissions } from '../../app/permissions.decorator.js';
import { AdminOpsService } from './admin-ops.service.js';

@Controller('admin/settings')
@RequirePermissions('admin.access')
export class AdminOpsController {
  constructor(@Inject(AdminOpsService) private readonly adminOpsService: AdminOpsService) {}

  @Get()
  listSettings(@CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.adminOpsService.listSettings(authContext!);
  }

  @Get(':key')
  getSetting(@Param('key') key: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.adminOpsService.getSetting(key, authContext!);
  }

  @Put(':key')
  updateSetting(
    @Param('key') key: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.adminOpsService.upsertSetting(key, body, extractRequestAuditContext(request), authContext!);
  }

}

@Controller('admin/settings/email')
@RequirePermissions('admin.access')
export class EmailSettingsController {
  constructor(@Inject(AdminOpsService) private readonly adminOpsService: AdminOpsService) {}

  @Post('test')
  testEmail(
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.adminOpsService.testEmail(body, extractRequestAuditContext(request), authContext!);
  }
}

@Controller('platform')
@RequirePermissions('payment.read')
export class PlatformOpsController {
  constructor(@Inject(AdminOpsService) private readonly adminOpsService: AdminOpsService) {}

  @Get('payment-config')
  getPaymentConfig(@CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.adminOpsService.getPaymentConfig(authContext!);
  }

  @Get('invoice-context/:kind/:id')
  getInvoiceContext(
    @Param('kind') kind: string,
    @Param('id') id: string,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.adminOpsService.getInvoiceContext(kind, id, authContext!);
  }

  @Get('notifications')
  getNotifications(
    @Query() query: Record<string, string | string[] | undefined>,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.adminOpsService.listNotifications(query, authContext!);
  }
}
