import { BadRequestException, ConflictException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { z } from 'zod';
import type { RequestAuditContext } from '../../app/auth-context.js';
import { PrismaService } from '../../app/prisma.service.js';
import { AuditService } from '../audit-observability/audit.service.js';
import { IdentityAccessRepository } from './identity-access.repository.js';

const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  externalSubject: z.string().min(1).max(255).optional(),
  roleIds: z.array(z.string().min(1)).default([])
});

const createRoleSchema = z.object({
  code: z.string().min(2).max(64).regex(/^[a-z0-9_.-]+$/),
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(500).optional()
});

const createPermissionSchema = z.object({
  code: z.string().min(2).max(64).regex(/^[a-z0-9_.-]+$/),
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(500).optional()
});

const assignRolesSchema = z.object({
  roleIds: z.array(z.string().min(1)).min(1)
});

const syncRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string().min(1))
});

const publicRegistrationSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(10).max(128),
  companyName: z.string().trim().min(1).max(160).optional(),
  country: z.string().trim().min(2).max(80).optional()
});

type PublicRegistrationKind = 'buyer' | 'supplier';

@Injectable()
export class IdentityAccessService {
  constructor(
    @Inject(IdentityAccessRepository)
    private readonly identityAccessRepository: IdentityAccessRepository,
    @Inject(PrismaService)
    private readonly prismaService: PrismaService,
    @Inject(AuditService)
    private readonly auditService: AuditService
  ) {}

  listUsers() {
    return this.identityAccessRepository.listUsers();
  }

  getUserById(id: string) {
    return this.identityAccessRepository.getUserById(id);
  }

  async createUser(input: unknown, auditContext: RequestAuditContext) {
    const user = await this.identityAccessRepository.createUser(createUserSchema.parse(input));

    await this.auditService.record({
      module: 'identity-access',
      eventType: 'identity.user.created',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'user',
      subjectId: user.id,
      payload: {
        email: user.email,
        roleIds: user.userRoles.map((entry) => entry.roleId)
      }
    });

    return user;
  }

  async registerPublicAccount(kind: unknown, input: unknown, auditContext: RequestAuditContext) {
    const accountType = this.parsePublicRegistrationKind(kind);
    const payload = this.parsePublicRegistrationInput(input, accountType);

    const adminUser = process.env.KEYCLOAK_ADMIN_USER ?? 'admin';
    const adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD ?? 'admin';
    const internalUrl = process.env.KEYCLOAK_INTERNAL_URL ?? 'http://keycloak:8080/auth';
    const roleCode = accountType === 'buyer' ? 'customer_user' : 'supplier_user';

    const [existingByEmail, role] = await Promise.all([
      this.prismaService.client.user.findFirst({
        where: {
          email: payload.email
        },
        select: {
          id: true
        }
      }),
      this.prismaService.client.role.findUnique({
        where: {
          code: roleCode
        },
        select: {
          id: true,
          code: true
        }
      })
    ]);

    if (existingByEmail) {
      throw new ConflictException('An account with this email already exists.');
    }

    if (!role) {
      throw new ServiceUnavailableException('Registration roles are not ready yet.');
    }

    const realm = process.env.KEYCLOAK_REALM ?? 'ruflo';
    const adminToken = await this.getKeycloakAdminToken(internalUrl, adminUser, adminPassword);
    const keycloakUserId = await this.createKeycloakUser(internalUrl, realm, adminToken, payload, accountType);

    try {
      const displayName = payload.companyName?.trim() || `${payload.firstName} ${payload.lastName}`.trim();

      const user = await this.prismaService.client.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            status: 'active',
            externalSubject: keycloakUserId
          }
        });

        await tx.userRole.create({
          data: {
            userId: createdUser.id,
            roleId: role.id
          }
        });

        if (accountType === 'buyer') {
          await tx.buyerProfile.create({
            data: {
              userId: createdUser.id,
              buyerType: 'consumer',
              displayName
            }
          });
        } else {
          await tx.sellerProfile.create({
            data: {
              userId: createdUser.id,
              sellerType: 'business',
              displayName,
              ...(payload.companyName ? { companyName: payload.companyName } : {}),
              ...(payload.country ? { country: payload.country } : {})
            }
          });
        }

        return createdUser;
      });

      await this.auditService.record({
        module: 'identity-access',
        eventType: 'identity.public-registration.completed',
        actorId: auditContext.actorId,
        tenantId: auditContext.tenantId,
        correlationId: auditContext.correlationId,
        subjectType: 'user',
        subjectId: user.id,
        payload: {
          email: user.email,
          accountType,
          keycloakUserId
        }
      });

      return {
        success: true,
        userId: user.id,
        accountType,
        loginUrl: '/auth/login?returnTo=/dashboard'
      };
    } catch (error) {
      await this.deleteKeycloakUser(internalUrl, realm, adminToken, keycloakUserId);
      throw error;
    }
  }

  listRoles() {
    return this.identityAccessRepository.listRoles();
  }

  async createRole(input: unknown, auditContext: RequestAuditContext) {
    const role = await this.identityAccessRepository.createRole(createRoleSchema.parse(input));

    await this.auditService.record({
      module: 'identity-access',
      eventType: 'identity.role.created',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'role',
      subjectId: role.id,
      payload: {
        code: role.code,
        name: role.name
      }
    });

    return role;
  }

  listPermissions() {
    return this.identityAccessRepository.listPermissions();
  }

  async createPermission(input: unknown, auditContext: RequestAuditContext) {
    const permission = await this.identityAccessRepository.createPermission(createPermissionSchema.parse(input));

    await this.auditService.record({
      module: 'identity-access',
      eventType: 'identity.permission.created',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'permission',
      subjectId: permission.id,
      payload: {
        code: permission.code,
        name: permission.name
      }
    });

    return permission;
  }

  async assignRoles(userId: string, input: unknown, auditContext: RequestAuditContext) {
    const { roleIds } = assignRolesSchema.parse(input);
    const user = await this.identityAccessRepository.assignRoles(userId, roleIds);

    await this.auditService.record({
      module: 'identity-access',
      eventType: 'identity.user.roles.assigned',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'user',
      subjectId: user.id,
      payload: {
        roleIds
      }
    });

    return user;
  }

  async syncRolePermissions(roleId: string, input: unknown, auditContext: RequestAuditContext) {
    const { permissionIds } = syncRolePermissionsSchema.parse(input);
    const role = await this.identityAccessRepository.syncRolePermissions(roleId, permissionIds);

    await this.auditService.record({
      module: 'identity-access',
      eventType: 'identity.role.permissions.synced',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'role',
      subjectId: role.id,
      payload: {
        permissionIds
      }
    });

    return role;
  }

  private parsePublicRegistrationKind(kind: unknown): PublicRegistrationKind {
    if (kind === 'buyer' || kind === 'supplier') {
      return kind;
    }

    throw new BadRequestException('Registration type must be buyer or supplier.');
  }

  private parsePublicRegistrationInput(input: unknown, kind: PublicRegistrationKind) {
    const parsed = publicRegistrationSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((issue) => issue.message).join('; '));
    }

    if (kind === 'supplier' && !parsed.data.companyName?.trim()) {
      throw new BadRequestException('Company name is required for supplier registration.');
    }

    return {
      ...parsed.data,
      email: parsed.data.email.toLowerCase(),
      companyName: parsed.data.companyName?.trim()
    };
  }

  private async getKeycloakAdminToken(internalUrl: string, username: string, password: string) {
    const response = await fetch(`${internalUrl}/realms/master/protocol/openid-connect/token`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: 'admin-cli',
        username,
        password
      })
    });

    if (!response.ok) {
      throw new ServiceUnavailableException('Registration service is temporarily unavailable.');
    }

    const body = (await response.json()) as { access_token?: string };
    if (!body.access_token) {
      throw new ServiceUnavailableException('Registration service is temporarily unavailable.');
    }

    return body.access_token;
  }

  private async createKeycloakUser(
    internalUrl: string,
    realm: string,
    accessToken: string,
    input: { firstName: string; lastName: string; email: string; password: string },
    kind: PublicRegistrationKind
  ) {
    const existingResponse = await fetch(
      `${internalUrl}/admin/realms/${realm}/users?email=${encodeURIComponent(input.email)}&exact=true`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!existingResponse.ok) {
      throw new ServiceUnavailableException('Registration service is temporarily unavailable.');
    }

    const existingUsers = (await existingResponse.json()) as Array<{ id: string }>;
    if (existingUsers.length > 0) {
      throw new ConflictException('An account with this email already exists.');
    }

    const response = await fetch(`${internalUrl}/admin/realms/${realm}/users`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        username: input.email,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        enabled: true,
        emailVerified: true,
        attributes: {
          accountType: [kind]
        },
        credentials: [
          {
            type: 'password',
            value: input.password,
            temporary: false
          }
        ]
      })
    });

    if (response.status === 409) {
      throw new ConflictException('An account with this email already exists.');
    }

    if (!response.ok && response.status !== 201) {
      throw new ServiceUnavailableException('Registration service is temporarily unavailable.');
    }

    const location = response.headers.get('location');
    const userId = location?.split('/').filter(Boolean).pop();

    if (userId) {
      return userId;
    }

    const lookup = await fetch(
      `${internalUrl}/admin/realms/${realm}/users?email=${encodeURIComponent(input.email)}&exact=true`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!lookup.ok) {
      throw new ServiceUnavailableException('Registration service is temporarily unavailable.');
    }

    const users = (await lookup.json()) as Array<{ id: string }>;
    if (!users[0]?.id) {
      throw new ServiceUnavailableException('Registration service is temporarily unavailable.');
    }

    return users[0].id;
  }

  private async deleteKeycloakUser(internalUrl: string, realm: string, accessToken: string, userId: string) {
    try {
      await fetch(`${internalUrl}/admin/realms/${realm}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          authorization: `Bearer ${accessToken}`
        }
      });
    } catch {
      // Best-effort cleanup.
    }
  }
}
