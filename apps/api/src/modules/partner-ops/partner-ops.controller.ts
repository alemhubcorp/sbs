import { Body, Controller, Get, Inject, Param, Post, Put, Query, Req } from '@nestjs/common';
import { CurrentAuthContext } from '../../app/current-auth-context.decorator.js';
import { extractRequestAuditContext, type ApiRequestLike } from '../../app/auth-context.js';
import { RequirePermissions } from '../../app/permissions.decorator.js';
import { PartnerOpsService } from './partner-ops.service.js';

@Controller('partner-ops')
export class PartnerOpsController {
  constructor(@Inject(PartnerOpsService) private readonly partnerOpsService: PartnerOpsService) {}

  @Get('assignments')
  listAssignments(
    @Query() query: Record<string, string | string[] | undefined>,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.partnerOpsService.listAssignments(authContext!, query);
  }

  @Get('assignments/:id')
  getAssignment(@Param('id') id: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.partnerOpsService.getAssignmentById(id, authContext!);
  }

  @Post('assignments')
  @RequirePermissions('admin.access')
  createAssignment(@Body() body: unknown, @Req() request: ApiRequestLike, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.partnerOpsService.createAssignment(body, extractRequestAuditContext(request), authContext!);
  }

  @Put('assignments/:id')
  @RequirePermissions('admin.access')
  updateAssignment(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.partnerOpsService.updateAssignment(id, body, extractRequestAuditContext(request), authContext!);
  }

  @Put('assignments/:id/status')
  updateAssignmentStatus(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.partnerOpsService.updateAssignmentStatus(id, body, extractRequestAuditContext(request), authContext!);
  }

  @Get('organizations')
  @RequirePermissions('admin.access')
  listOrganizations(
    @Query() query: Record<string, string | string[] | undefined>,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.partnerOpsService.listOrganizations(authContext!, query);
  }
}
