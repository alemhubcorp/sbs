import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import type { AuthContext } from './auth-context.js';

@Injectable()
export class AuthorizationContextService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async enrichAuthContext(baseContext: AuthContext): Promise<AuthContext> {
    if (!baseContext.isAuthenticated) {
      return baseContext;
    }

    const user = await this.prismaService.client.user.findFirst({
      where: {
        OR: [
          baseContext.subject ? { externalSubject: baseContext.subject } : undefined,
          baseContext.email ? { email: baseContext.email } : undefined
        ].filter(Boolean) as Array<Record<string, string>>
      },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        },
        memberships: {
          where: {
            status: 'active'
          }
        }
      }
    });

    if (!user) {
      return {
        ...baseContext,
        internalUserId: null,
        permissions: [],
        tenantIds: []
      };
    }

    const dbRoles = user.userRoles.map((entry) => entry.role.code);
    const permissions = user.userRoles.flatMap((entry) =>
      entry.role.rolePermissions.map((rolePermission) => rolePermission.permission.code)
    );
    const tenantIds = user.memberships.map((membership) => membership.tenantId);

    return {
      ...baseContext,
      internalUserId: user.id,
      tenantId: baseContext.tenantId ?? tenantIds[0] ?? null,
      tenantIds,
      roles: [...new Set([...baseContext.roles, ...dbRoles])],
      permissions: [...new Set(permissions)]
    };
  }
}
