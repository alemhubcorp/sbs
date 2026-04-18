import { Body, Controller, Get, Inject, Param, Post, Put, Req } from '@nestjs/common';
import { extractRequestAuditContext, type ApiRequestLike } from '../../app/auth-context.js';
import { CurrentAuthContext } from '../../app/current-auth-context.decorator.js';
import { Public } from '../../app/public.decorator.js';
import { RequirePermissions } from '../../app/permissions.decorator.js';
import { IdentityAccessService } from './identity-access.service.js';

@Controller('identity')
export class IdentityAccessController {
  constructor(
    @Inject(IdentityAccessService)
    private readonly identityAccessService: IdentityAccessService
  ) {}

  @Get('users')
  @RequirePermissions('identity.read')
  listUsers() {
    return this.identityAccessService.listUsers();
  }

  @Get('context')
  context(@CurrentAuthContext() authContext: unknown) {
    return authContext;
  }

  @Get('users/:id')
  @RequirePermissions('identity.read')
  getUserById(@Param('id') id: string) {
    return this.identityAccessService.getUserById(id);
  }

  @Post('users')
  @RequirePermissions('identity.manage')
  createUser(@Body() body: unknown, @Req() request: ApiRequestLike) {
    return this.identityAccessService.createUser(body, extractRequestAuditContext(request));
  }

  @Post('public/register/:kind')
  @Public()
  registerPublicAccount(@Param('kind') kind: string, @Body() body: unknown, @Req() request: ApiRequestLike) {
    return this.identityAccessService.registerPublicAccount(kind, body, extractRequestAuditContext(request));
  }

  @Put('users/:id/roles')
  @RequirePermissions('identity.manage')
  assignRoles(@Param('id') id: string, @Body() body: unknown, @Req() request: ApiRequestLike) {
    return this.identityAccessService.assignRoles(id, body, extractRequestAuditContext(request));
  }

  @Get('roles')
  @RequirePermissions('identity.read')
  listRoles() {
    return this.identityAccessService.listRoles();
  }

  @Post('roles')
  @RequirePermissions('identity.manage')
  createRole(@Body() body: unknown, @Req() request: ApiRequestLike) {
    return this.identityAccessService.createRole(body, extractRequestAuditContext(request));
  }

  @Put('roles/:id/permissions')
  @RequirePermissions('identity.manage')
  syncRolePermissions(@Param('id') id: string, @Body() body: unknown, @Req() request: ApiRequestLike) {
    return this.identityAccessService.syncRolePermissions(id, body, extractRequestAuditContext(request));
  }

  @Get('permissions')
  @RequirePermissions('identity.read')
  listPermissions() {
    return this.identityAccessService.listPermissions();
  }

  @Post('permissions')
  @RequirePermissions('identity.manage')
  createPermission(@Body() body: unknown, @Req() request: ApiRequestLike) {
    return this.identityAccessService.createPermission(body, extractRequestAuditContext(request));
  }
}
