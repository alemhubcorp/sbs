import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { AuthorizationContextService } from './authorization-context.service.js';
import { KeycloakJwtService } from './keycloak-jwt.service.js';

@Injectable()
export class AuthContextGuard implements CanActivate {
  constructor(
    @Inject(KeycloakJwtService) private readonly keycloakJwtService: KeycloakJwtService,
    @Inject(AuthorizationContextService) private readonly authorizationContextService: AuthorizationContextService
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
      authContext?: unknown;
    }>();
    const baseContext = await this.keycloakJwtService.resolveAuthContext(request.headers?.authorization);
    request.authContext = await this.authorizationContextService.enrichAuthContext(baseContext);
    return true;
  }
}
