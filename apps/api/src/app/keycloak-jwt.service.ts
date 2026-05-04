import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { createAnonymousAuthContext, type AuthContext } from './auth-context.js';

function readStringClaim(payload: JWTPayload, claim: string): string | null {
  const value = payload[claim];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readRoles(payload: JWTPayload): string[] {
  const realmAccess = payload.realm_access;
  const realmRoles =
    realmAccess && typeof realmAccess === 'object' && Array.isArray((realmAccess as { roles?: unknown }).roles)
      ? ((realmAccess as { roles: unknown[] }).roles.filter((role): role is string => typeof role === 'string'))
      : [];

  const resourceAccess = payload.resource_access;
  const resourceRoles =
    resourceAccess && typeof resourceAccess === 'object'
      ? Object.values(resourceAccess as Record<string, unknown>).flatMap((entry) => {
          if (!entry || typeof entry !== 'object') {
            return [];
          }

          const roles = (entry as { roles?: unknown }).roles;
          return Array.isArray(roles) ? roles.filter((role): role is string => typeof role === 'string') : [];
        })
      : [];

  return [...new Set([...realmRoles, ...resourceRoles])];
}

@Injectable()
export class KeycloakJwtService {
  private jwks?: ReturnType<typeof createRemoteJWKSet>;

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  private getRealmPath() {
    const realm = this.configService.getOrThrow<string>('auth.realm');
    return `/realms/${realm}`;
  }

  private trimTrailingSlash(value: string) {
    return value.endsWith('/') ? value.slice(0, -1) : value;
  }

  private getIssuerUrl() {
    const issuer =
      this.configService.get<string>('auth.issuer') ??
      process.env.KEYCLOAK_ISSUER ??
      null;

    if (issuer) {
      return this.trimTrailingSlash(issuer);
    }

    const publicUrl =
      this.configService.get<string>('auth.publicUrl') ??
      process.env.KEYCLOAK_PUBLIC_URL ??
      `http://${this.configService.getOrThrow<string>('auth.keycloakHost')}:${this.configService.getOrThrow<number>('auth.keycloakPort')}/auth`;

    return `${this.trimTrailingSlash(publicUrl)}${this.getRealmPath()}`;
  }

  private getJwksBaseUrl() {
    const internalUrl =
      this.configService.get<string>('auth.internalUrl') ??
      process.env.KEYCLOAK_INTERNAL_URL ??
      `http://${this.configService.getOrThrow<string>('auth.keycloakHost')}:${this.configService.getOrThrow<number>('auth.keycloakPort')}/auth`;

    return this.trimTrailingSlash(internalUrl);
  }

  private getJwks() {
    if (!this.jwks) {
      this.jwks = createRemoteJWKSet(new URL(`${this.getJwksBaseUrl()}${this.getRealmPath()}/protocol/openid-connect/certs`));
    }

    return this.jwks;
  }

  async resolveAuthContext(authorizationHeader?: string | string[]): Promise<AuthContext> {
    if (!authorizationHeader) {
      return createAnonymousAuthContext();
    }

    const rawHeader = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;

    if (!rawHeader) {
      return createAnonymousAuthContext();
    }

    const [scheme, token] = rawHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Authorization header must use the Bearer scheme.');
    }

    const audienceRaw = this.configService.get<string>('auth.audience');
    if (this.configService.get<string>('app.env') === 'production' && !audienceRaw) {
      throw new UnauthorizedException('KEYCLOAK_AUDIENCE is required in production.');
    }
    // Support comma-separated list so multiple clients (e.g. ruflo-web-ui,ruflo-admin-ui)
    // can be accepted during the transition while the Keycloak audience mapper propagates.
    const audienceList = audienceRaw
      ? audienceRaw.split(',').map((a) => a.trim()).filter(Boolean)
      : [];
    const audience = audienceList.length === 1 ? audienceList[0] : audienceList.length > 1 ? audienceList : undefined;
    const verifyOptions = audience
      ? { issuer: this.getIssuerUrl(), audience }
      : { issuer: this.getIssuerUrl() };

    let payload: JWTPayload;

    try {
      const verified = await jwtVerify(token, this.getJwks(), verifyOptions);
      payload = verified.payload;
    } catch {
      throw new UnauthorizedException('Invalid or unverifiable bearer token.');
    }

    return {
      isAuthenticated: true,
      subject: payload.sub ?? null,
      email: readStringClaim(payload, 'email'),
      username: readStringClaim(payload, 'preferred_username'),
      internalUserId: null,
      tenantId: readStringClaim(payload, 'tenant_id'),
      tenantIds: [],
      roles: readRoles(payload),
      permissions: [],
      tokenIssuer: payload.iss ?? null
    };
  }
}
