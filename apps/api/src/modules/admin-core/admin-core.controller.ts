import { Body, Controller, Get, Inject, Param, Post, Query, Req } from '@nestjs/common';
import { CurrentAuthContext } from '../../app/current-auth-context.decorator.js';
import { extractRequestAuditContext, type ApiRequestLike } from '../../app/auth-context.js';
import { RequirePermissions } from '../../app/permissions.decorator.js';
import { AdminCoreService } from './admin-core.service.js';

@Controller('admin')
@RequirePermissions('admin.access')
export class AdminCoreController {
  constructor(@Inject(AdminCoreService) private readonly adminCoreService: AdminCoreService) {}

  @Get('approvals')
  @RequirePermissions('approval.read')
  listApprovals(
    @Query() query: Record<string, string | string[] | undefined>,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.adminCoreService.listApprovals(query, authContext!);
  }

  @Post('approvals/:id/approve')
  @RequirePermissions('approval.manage')
  approveApproval(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.adminCoreService.approveApproval(id, body, extractRequestAuditContext(request), authContext!);
  }

  @Post('approvals/:id/reject')
  @RequirePermissions('approval.manage')
  rejectApproval(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.adminCoreService.rejectApproval(id, body, extractRequestAuditContext(request), authContext!);
  }
}
