import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ApiRequestLike } from './auth-context.js';
import { IS_PUBLIC_ROUTE } from './public.decorator.js';
import { REQUIRED_PERMISSIONS, REQUIRE_TENANT_CONTEXT } from './permissions.decorator.js';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass()
    ]);

    const request = context.switchToHttp().getRequest<ApiRequestLike>();
    const authContext = request.authContext;

    if (isPublic) {
      return true;
    }

    if (!authContext?.isAuthenticated || !authContext.internalUserId) {
      throw new UnauthorizedException('Authentication is required.');
    }

    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS, [context.getHandler(), context.getClass()]) ?? [];

    const requireTenantContext = this.reflector.getAllAndOverride<boolean>(REQUIRE_TENANT_CONTEXT, [
      context.getHandler(),
      context.getClass()
    ]);

    if (authContext.roles.includes('platform_admin')) {
      return true;
    }

    if (requireTenantContext && !authContext.tenantId) {
      throw new ForbiddenException('Tenant-scoped access is required.');
    }

    if (requiredPermissions.length > 0) {
      const grantedPermissions = new Set(authContext.permissions);
      const hasAllPermissions = requiredPermissions.every((permission) => grantedPermissions.has(permission));

      if (!hasAllPermissions) {
        throw new ForbiddenException(`Missing required permissions: ${requiredPermissions.join(', ')}`);
      }
    }

    return true;
  }
}
