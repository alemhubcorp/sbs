import { Body, Controller, Get, Inject, Param, Post, Put, Req } from '@nestjs/common';
import { CurrentAuthContext } from '../../app/current-auth-context.decorator.js';
import { extractRequestAuditContext, type ApiRequestLike } from '../../app/auth-context.js';
import { RequirePermissions, RequireTenantContext } from '../../app/permissions.decorator.js';
import { TenantOrgService } from './tenant-org.service.js';

@Controller()
export class TenantOrgController {
  constructor(@Inject(TenantOrgService) private readonly tenantOrgService: TenantOrgService) {}

  @Get('tenants')
  @RequirePermissions('tenant.read')
  listTenants(@CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.tenantOrgService.listTenants(authContext!);
  }

  @Get('tenants/:id')
  @RequirePermissions('tenant.read')
  getTenantById(@Param('id') id: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.tenantOrgService.getTenantById(id, authContext!);
  }

  @Post('tenants')
  @RequirePermissions('tenant.manage')
  createTenant(@Body() body: unknown, @Req() request: ApiRequestLike) {
    return this.tenantOrgService.createTenant(body, extractRequestAuditContext(request));
  }

  @Get('tenants/:id/organizations')
  @RequirePermissions('tenant.read')
  @RequireTenantContext()
  listOrganizations(@Param('id') id: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.tenantOrgService.listOrganizations(id, authContext!);
  }

  @Post('tenants/:id/organizations')
  @RequirePermissions('tenant.manage')
  @RequireTenantContext()
  createOrganization(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.tenantOrgService.createOrganization(id, body, extractRequestAuditContext(request), authContext!);
  }

  @Put('tenants/:id/organizations/:organizationId')
  @RequirePermissions('tenant.manage')
  @RequireTenantContext()
  updateOrganization(
    @Param('id') id: string,
    @Param('organizationId') organizationId: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.tenantOrgService.updateOrganization(id, organizationId, body, extractRequestAuditContext(request), authContext!);
  }

  @Get('tenants/:id/org-units')
  @RequirePermissions('tenant.read')
  @RequireTenantContext()
  listOrgUnits(@Param('id') id: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.tenantOrgService.listOrgUnits(id, authContext!);
  }

  @Post('tenants/:id/org-units')
  @RequirePermissions('tenant.manage')
  @RequireTenantContext()
  createOrgUnit(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.tenantOrgService.createOrgUnit(id, body, extractRequestAuditContext(request), authContext!);
  }

  @Get('tenants/:id/memberships')
  @RequirePermissions('tenant.read')
  @RequireTenantContext()
  listMemberships(@Param('id') id: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.tenantOrgService.listMemberships(id, authContext!);
  }

  @Post('tenants/:id/memberships')
  @RequirePermissions('tenant.manage')
  @RequireTenantContext()
  createMembership(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.tenantOrgService.createMembership(id, body, extractRequestAuditContext(request), authContext!);
  }
}
