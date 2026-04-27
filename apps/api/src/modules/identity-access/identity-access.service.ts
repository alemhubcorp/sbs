import { BadRequestException, ConflictException, Inject, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';
import type { RequestAuditContext } from '../../app/auth-context.js';
import { PrismaService } from '../../app/prisma.service.js';
import { AuditService } from '../audit-observability/audit.service.js';
import { AdminOpsService } from '../admin-ops/admin-ops.service.js';
import { EmailService } from '../notifications-core/email.service.js';
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
  country: z.string().trim().min(2).max(80).optional(),
  consents: z
    .array(
      z.object({
        documentSlug: z.string().trim().min(1).max(120),
        version: z.string().trim().min(1).max(40)
      })
    )
    .default([])
});

const createAccountSchema = z.object({
  email: z.string().trim().email().max(255),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  password: z.string().min(10).max(128),
  roleIds: z.array(z.string().min(1)).default([]),
  status: z.enum(['active', 'disabled']).default('active'),
  accountType: z.enum(['employee', 'user']).default('user')
});

const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'disabled'])
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(255)
});

const resetPasswordSchema = z
  .object({
    token: z.string().min(20).max(4096),
    password: z.string().min(10).max(128),
    confirmPassword: z.string().min(10).max(128)
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords do not match.'
      });
    }
  });

type PublicRegistrationKind = 'buyer' | 'supplier';

@Injectable()
export class IdentityAccessService {
  constructor(
    @Inject(IdentityAccessRepository)
    private readonly identityAccessRepository: IdentityAccessRepository,
    @Inject(AdminOpsService)
    private readonly adminOpsService: AdminOpsService,
    @Inject(PrismaService)
    private readonly prismaService: PrismaService,
    @Inject(AuditService)
    private readonly auditService: AuditService,
    @Inject(EmailService)
    private readonly emailService: EmailService
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

  async createAccount(input: unknown, auditContext: RequestAuditContext) {
    const parsed = createAccountSchema.parse(input);
    const governance = await this.adminOpsService.getAuthGovernanceConfig();
    const allowedRoleCodes =
      parsed.accountType === 'employee'
        ? new Set(['platform_admin', 'logistics_company', 'customs_broker'])
        : new Set(['customer_user', 'supplier_user']);

    const roles = parsed.roleIds.length
      ? await this.prismaService.client.role.findMany({
          where: {
            id: {
              in: parsed.roleIds
            }
          },
          select: {
            id: true,
            code: true
          }
        })
      : [];

    if (roles.length !== new Set(parsed.roleIds).size) {
      throw new BadRequestException('One or more selected roles were not found.');
    }

    for (const role of roles) {
      if (!allowedRoleCodes.has(role.code)) {
        throw new BadRequestException(`Role ${role.code} is not allowed for ${parsed.accountType} accounts.`);
      }
    }

    if (governance.emailVerificationRequired && !governance.smtpConfigured) {
      throw new ServiceUnavailableException('Email verification is enabled, but outbound email is not configured.');
    }

    const adminUser = process.env.KEYCLOAK_ADMIN_USER ?? 'admin';
    const adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD ?? 'admin';
    const internalUrl = process.env.KEYCLOAK_INTERNAL_URL ?? 'http://keycloak:8080/auth';
    const realm = process.env.KEYCLOAK_REALM ?? 'ruflo';
    const adminToken = await this.getKeycloakAdminToken(internalUrl, adminUser, adminPassword);
    const email = parsed.email.toLowerCase();
    const keycloakUserId = await this.createKeycloakUser(
      internalUrl,
      realm,
      adminToken,
      {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        email,
        password: parsed.password
      },
      {
        accountType: parsed.accountType,
        emailVerified: !governance.emailVerificationRequired,
        enabled: parsed.status === 'active'
      }
    );

    try {
      const user = await this.identityAccessRepository.createUser({
        email,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        externalSubject: keycloakUserId,
        roleIds: parsed.roleIds,
        status: parsed.status
      });

      if (governance.emailVerificationRequired) {
        await this.sendKeycloakVerifyEmail(internalUrl, realm, adminToken, keycloakUserId);
      }

      await this.auditService.record({
        module: 'identity-access',
        eventType: 'identity.account.created',
        actorId: auditContext.actorId,
        tenantId: auditContext.tenantId,
        correlationId: auditContext.correlationId,
        subjectType: 'user',
        subjectId: user.id,
        payload: {
          email: user.email,
          accountType: parsed.accountType,
          status: parsed.status,
          roleIds: parsed.roleIds,
          emailVerificationRequired: governance.emailVerificationRequired
        }
      });

      return {
        ...user,
        emailVerificationRequired: governance.emailVerificationRequired
      };
    } catch (error) {
      await this.deleteKeycloakUser(internalUrl, realm, adminToken, keycloakUserId);
      throw error;
    }
  }

  async registerPublicAccount(kind: unknown, input: unknown, auditContext: RequestAuditContext) {
    const accountType = this.parsePublicRegistrationKind(kind);
    const payload = this.parsePublicRegistrationInput(input, accountType);
    const governance = await this.adminOpsService.getAuthGovernanceConfig();

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

    if (governance.emailVerificationRequired && !governance.smtpConfigured) {
      throw new ServiceUnavailableException(
        'Registration is temporarily unavailable because email verification is required but outbound email is not configured.'
      );
    }

    const realm = process.env.KEYCLOAK_REALM ?? 'ruflo';
    const adminToken = await this.getKeycloakAdminToken(internalUrl, adminUser, adminPassword);
    const keycloakUserId = await this.createKeycloakUser(
      internalUrl,
      realm,
      adminToken,
      payload,
      {
        accountType,
        emailVerified: !governance.emailVerificationRequired,
        enabled: true
      }
    );

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
          keycloakUserId,
          emailVerificationRequired: governance.emailVerificationRequired
        }
      });

      await this.adminOpsService.recordConsents(accountType === 'buyer' ? 'buyer_registration' : 'supplier_registration', payload.consents, {
        userId: user.id,
        email: user.email,
        entityType: 'user',
        entityId: user.id,
        metadata: {
          accountType
        }
      });

      if (governance.emailVerificationRequired) {
        await this.sendKeycloakVerifyEmail(internalUrl, realm, adminToken, keycloakUserId);
      }

      const recipientName = `${payload.firstName} ${payload.lastName}`.trim();
      const webUrl = this.resolveWebAppUrl();
      void this.emailService.sendEmail(
        'auth.registration.welcome',
        { id: user.id, email: user.email, name: recipientName },
        {
          subject: `Welcome to Alemhub, ${payload.firstName}!`,
          title: `Registration complete`,
          message: [
            `Hi ${payload.firstName},`,
            '',
            `Your ${accountType} account has been created successfully.`,
            '',
            governance.emailVerificationRequired
              ? 'Please check your inbox and verify your email address before signing in.'
              : `You can sign in now at: ${webUrl}/signin`,
            '',
            'Thank you for joining Alemhub marketplace.'
          ].join('\n')
        }
      );

      return {
        success: true,
        userId: user.id,
        accountType,
        emailVerificationRequired: governance.emailVerificationRequired,
        loginUrl: '/signin?returnTo=/dashboard'
      };
    } catch (error) {
      await this.deleteKeycloakUser(internalUrl, realm, adminToken, keycloakUserId);
      throw error;
    }
  }

  async requestPasswordReset(input: unknown, auditContext: RequestAuditContext) {
    const parsed = forgotPasswordSchema.parse(input);
    const email = parsed.email.toLowerCase();
    const user = await this.prismaService.client.user.findFirst({
      where: {
        email
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        externalSubject: true
      }
    });

    if (!user || user.status !== 'active') {
      await this.auditService.record({
        module: 'identity-access',
        eventType: 'identity.password-reset.requested.unknown',
        actorId: auditContext.actorId,
        tenantId: auditContext.tenantId,
        correlationId: auditContext.correlationId,
        subjectType: 'user',
        subjectId: email,
        payload: {
          email
        }
      });

      return {
        success: true,
        emailDelivery: 'not_requested'
      };
    }

    const token = await this.issuePasswordResetToken(user.id, user.email);
    const resetUrl = `${this.resolveWebAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    const recipientName = `${user.firstName} ${user.lastName}`.trim() || user.email;
    const emailResult = await this.emailService.sendEmail(
      'auth.password-reset.requested',
      {
        id: user.id,
        email: user.email,
        name: recipientName
      },
      {
        subject: 'Reset your Alemhub password',
        title: 'Password reset requested',
        message: [
          'We received a request to reset your Alemhub marketplace password.',
          '',
          `Open this secure link to continue: ${resetUrl}`,
          '',
          'This link expires in 30 minutes. If you did not request this change, you can ignore this email.'
        ].join('\n')
      }
    );

    if (!emailResult.sent) {
      if (emailResult.reason === 'smtp_not_configured') {
        throw new ServiceUnavailableException('Password reset email is unavailable because SMTP is not configured.');
      }

      throw new ServiceUnavailableException('Password reset email could not be delivered. Please try again later.');
    }

    await this.auditService.record({
      module: 'identity-access',
      eventType: 'identity.password-reset.requested',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'user',
      subjectId: user.id,
      payload: {
        email: user.email
      }
    });

    return {
      success: true,
      emailDelivery: 'sent'
    };
  }

  async resetPassword(input: unknown, auditContext: RequestAuditContext) {
    const parsed = resetPasswordSchema.parse(input);
    const claims = await this.verifyPasswordResetToken(parsed.token);
    const user = await this.prismaService.client.user.findUnique({
      where: {
        id: claims.userId
      },
      select: {
        id: true,
        email: true,
        status: true,
        externalSubject: true
      }
    });

    if (!user || user.status !== 'active' || user.email.toLowerCase() !== claims.email.toLowerCase()) {
      throw new UnauthorizedException('This password reset link is invalid or expired.');
    }

    const adminUser = process.env.KEYCLOAK_ADMIN_USER ?? 'admin';
    const adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD ?? 'admin';
    const internalUrl = process.env.KEYCLOAK_INTERNAL_URL ?? 'http://keycloak:8080/auth';
    const realm = process.env.KEYCLOAK_REALM ?? 'ruflo';
    const adminToken = await this.getKeycloakAdminToken(internalUrl, adminUser, adminPassword);
    const keycloakUserId = user.externalSubject ?? (await this.lookupKeycloakUserIdByEmail(internalUrl, realm, adminToken, user.email));

    await this.updateKeycloakPassword(internalUrl, realm, adminToken, keycloakUserId, parsed.password);

    await this.auditService.record({
      module: 'identity-access',
      eventType: 'identity.password-reset.completed',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'user',
      subjectId: user.id,
      payload: {
        email: user.email
      }
    });

    return {
      success: true
    };
  }

  async updateUserStatus(userId: string, input: unknown, auditContext: RequestAuditContext) {
    const parsed = updateUserStatusSchema.parse(input);
    const existingUser = await this.identityAccessRepository.getUserById(userId);

    if (!existingUser.externalSubject) {
      throw new BadRequestException('This user is not linked to an authentication account.');
    }

    const adminUser = process.env.KEYCLOAK_ADMIN_USER ?? 'admin';
    const adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD ?? 'admin';
    const internalUrl = process.env.KEYCLOAK_INTERNAL_URL ?? 'http://keycloak:8080/auth';
    const realm = process.env.KEYCLOAK_REALM ?? 'ruflo';
    const adminToken = await this.getKeycloakAdminToken(internalUrl, adminUser, adminPassword);

    await this.updateKeycloakUserEnabled(internalUrl, realm, adminToken, existingUser.externalSubject, parsed.status === 'active');
    const user = await this.identityAccessRepository.updateUserStatus(userId, parsed.status);

    await this.auditService.record({
      module: 'identity-access',
      eventType: 'identity.user.status.updated',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'user',
      subjectId: user.id,
      payload: {
        status: parsed.status
      }
    });

    return user;
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
    const response = await this.fetchWithTimeout(`${internalUrl}/realms/master/protocol/openid-connect/token`, {
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

  private async lookupKeycloakUserIdByEmail(internalUrl: string, realm: string, accessToken: string, email: string) {
    const lookup = await this.fetchWithTimeout(
      `${internalUrl}/admin/realms/${realm}/users?email=${encodeURIComponent(email)}&exact=true`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!lookup.ok) {
      throw new ServiceUnavailableException('Password reset service is temporarily unavailable.');
    }

    const users = (await lookup.json()) as Array<{ id: string }>;
    if (!users[0]?.id) {
      throw new ServiceUnavailableException('Password reset service is temporarily unavailable.');
    }

    return users[0].id;
  }

  private async updateKeycloakPassword(
    internalUrl: string,
    realm: string,
    accessToken: string,
    keycloakUserId: string,
    password: string
  ) {
    const response = await this.fetchWithTimeout(`${internalUrl}/admin/realms/${realm}/users/${keycloakUserId}/reset-password`, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        type: 'password',
        value: password,
        temporary: false
      })
    });

    if (!response.ok) {
      throw new ServiceUnavailableException('Password reset service is temporarily unavailable.');
    }
  }

  private async issuePasswordResetToken(userId: string, email: string) {
    const secret = await this.getPasswordResetSecret();
    return new SignJWT({ email, typ: 'password_reset' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime('30m')
      .sign(secret);
  }

  private async verifyPasswordResetToken(token: string) {
    try {
      const secret = await this.getPasswordResetSecret();
      const { payload } = await jwtVerify(token, secret, {
        algorithms: ['HS256']
      });

      const userId = payload.sub;
      const email = payload.email;
      const tokenType = payload.typ;

      if (typeof userId !== 'string' || typeof email !== 'string' || tokenType !== 'password_reset') {
        throw new UnauthorizedException('This password reset link is invalid or expired.');
      }

      return { userId, email };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('This password reset link is invalid or expired.');
    }
  }

  private async getPasswordResetSecret() {
    const secret =
      process.env.PASSWORD_RESET_SECRET ??
      process.env.KEYCLOAK_WEB_CLIENT_SECRET ??
      process.env.KEYCLOAK_ADMIN_CLIENT_SECRET;

    if (!secret) {
      throw new ServiceUnavailableException('Password reset service is not configured.');
    }

    return new TextEncoder().encode(secret);
  }

  private resolveWebAppUrl() {
    return (
      process.env.WEB_URL ??
      process.env.NEXT_PUBLIC_WEB_URL ??
      process.env.APP_URL ??
      'http://localhost:3001'
    ).replace(/\/+$/, '');
  }

  private static readonly KEYCLOAK_TIMEOUT_MS = 8_000;

  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), IdentityAccessService.KEYCLOAK_TIMEOUT_MS);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ServiceUnavailableException('The authentication service did not respond in time. Please try again in a moment.');
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private async createKeycloakUser(
    internalUrl: string,
    realm: string,
    accessToken: string,
    input: { firstName: string; lastName: string; email: string; password: string },
    options: { accountType: string; emailVerified: boolean; enabled: boolean }
  ) {
    const existingResponse = await this.fetchWithTimeout(
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

    const response = await this.fetchWithTimeout(`${internalUrl}/admin/realms/${realm}/users`, {
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
        enabled: options.enabled,
        emailVerified: options.emailVerified,
        attributes: {
          accountType: [options.accountType]
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

    const lookup = await this.fetchWithTimeout(
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

  private async sendKeycloakVerifyEmail(internalUrl: string, realm: string, accessToken: string, userId: string) {
    const clientId = process.env.KEYCLOAK_WEB_CLIENT_ID ?? 'ruflo-web-ui';
    const redirectUri = `${this.resolveWebAppUrl()}/signin`;
    const response = await this.fetchWithTimeout(
      `${internalUrl}/admin/realms/${realm}/users/${userId}/execute-actions-email?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}`,
      {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify(['VERIFY_EMAIL'])
      }
    );

    if (!response.ok) {
      throw new ServiceUnavailableException('Email verification could not be started.');
    }
  }

  private async updateKeycloakUserEnabled(internalUrl: string, realm: string, accessToken: string, userId: string, enabled: boolean) {
    const response = await this.fetchWithTimeout(`${internalUrl}/admin/realms/${realm}/users/${userId}`, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        enabled
      })
    });

    if (!response.ok) {
      throw new ServiceUnavailableException('User status could not be synchronized with authentication.');
    }
  }

  private async deleteKeycloakUser(internalUrl: string, realm: string, accessToken: string, userId: string) {
    try {
      await this.fetchWithTimeout(`${internalUrl}/admin/realms/${realm}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          authorization: `Bearer ${accessToken}`
        }
      });
    } catch {
      // Best-effort cleanup — ignore errors and timeouts.
    }
  }
}
