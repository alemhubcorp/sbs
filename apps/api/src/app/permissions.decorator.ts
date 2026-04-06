import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSIONS = 'requiredPermissions';
export const REQUIRE_TENANT_CONTEXT = 'requireTenantContext';

export const RequirePermissions = (...permissions: string[]) => SetMetadata(REQUIRED_PERMISSIONS, permissions);
export const RequireTenantContext = () => SetMetadata(REQUIRE_TENANT_CONTEXT, true);
