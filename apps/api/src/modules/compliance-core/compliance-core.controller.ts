import { Body, Controller, Get, Inject, Post, Put, Query, Req } from '@nestjs/common';
import { CurrentAuthContext } from '../../app/current-auth-context.decorator.js';
import { extractRequestAuditContext, type ApiRequestLike } from '../../app/auth-context.js';
import { RequirePermissions } from '../../app/permissions.decorator.js';
import { ComplianceCoreService } from './compliance-core.service.js';

@Controller('compliance')
export class ComplianceCoreController {
  constructor(@Inject(ComplianceCoreService) private readonly complianceCoreService: ComplianceCoreService) {}

  @Get('me')
  getMe(@CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.complianceCoreService.getMe(authContext!);
  }

  @Put('me')
  updateMe(
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.complianceCoreService.updateMe(body, extractRequestAuditContext(request), authContext!);
  }

  @Post('me/submit')
  submitMe(
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.complianceCoreService.submitMe(body, extractRequestAuditContext(request), authContext!);
  }

  @Get('requirements')
  listDocumentRequirements(@Query() query: Record<string, string | string[] | undefined>) {
    return this.complianceCoreService.listDocumentRequirements(query);
  }

  @Put('requirements')
  @RequirePermissions('admin.access')
  updateDocumentRequirements(
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.complianceCoreService.updateDocumentRequirements(body, extractRequestAuditContext(request), authContext!);
  }

  @Post('documents')
  uploadDocument(
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.complianceCoreService.uploadDocument(body, extractRequestAuditContext(request), authContext!);
  }
}
