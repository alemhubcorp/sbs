import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service.js';

const PLATFORM_PERMISSIONS = [
  'identity.read',
  'identity.manage',
  'tenant.read',
  'tenant.manage',
  'catalog.read',
  'catalog.manage',
  'retail.read',
  'retail.manage',
  'wholesale.read',
  'wholesale.manage',
  'contract.read',
  'contract.manage',
  'document.read',
  'document.manage',
  'payment.read',
  'payment.manage',
  'dispute.read',
  'dispute.manage',
  'logistics.read',
  'logistics.manage',
  'approval.read',
  'approval.manage',
  'admin.access'
];

@Injectable()
export class BootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  async onApplicationBootstrap() {
    await this.seedPermissions();
    await this.ensureKeycloakRealm();
  }

  private getConfigValue(key: string, fallback?: string) {
    const configured = this.configService.get<string>(key);

    if (configured && configured.length > 0) {
      return configured;
    }

    const envKey = key
      .replace(/\./g, '_')
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .toUpperCase();

    return process.env[envKey] ?? fallback;
  }

  private async seedPermissions() {
    for (const code of PLATFORM_PERMISSIONS) {
      await this.prismaService.client.permission.upsert({
        where: { code },
        update: {},
        create: {
          code,
          name: code
        }
      });
    }

    const platformAdmin = await this.prismaService.client.role.upsert({
      where: { code: 'platform_admin' },
      update: {
        name: 'Platform Admin'
      },
      create: {
        code: 'platform_admin',
        name: 'Platform Admin'
      }
    });

    const permissions = await this.prismaService.client.permission.findMany({
      where: {
        code: {
          in: PLATFORM_PERMISSIONS
        }
      }
    });

    await this.prismaService.client.rolePermission.deleteMany({
      where: { roleId: platformAdmin.id }
    });

    await this.prismaService.client.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId: platformAdmin.id,
        permissionId: permission.id
      })),
      skipDuplicates: true
    });

    const customerRole = await this.prismaService.client.role.upsert({
      where: { code: 'customer_user' },
      update: {
        name: 'Customer User'
      },
      create: {
        code: 'customer_user',
        name: 'Customer User'
      }
    });

    const customerPermissions = await this.prismaService.client.permission.findMany({
      where: {
        code: {
          in: ['catalog.read', 'retail.read', 'retail.manage']
        }
      }
    });

    await this.prismaService.client.rolePermission.deleteMany({
      where: { roleId: customerRole.id }
    });

    await this.prismaService.client.rolePermission.createMany({
      data: customerPermissions.map((permission) => ({
        roleId: customerRole.id,
        permissionId: permission.id
      })),
      skipDuplicates: true
    });

    const adminUser = await this.prismaService.client.user.upsert({
      where: { email: 'admin@ruflo.local' },
      update: {
        firstName: 'Platform',
        lastName: 'Admin',
        status: 'active'
      },
      create: {
        email: 'admin@ruflo.local',
        firstName: 'Platform',
        lastName: 'Admin',
        status: 'active'
      }
    });

    const buyerUser = await this.prismaService.client.user.upsert({
      where: { email: 'buyer@ruflo.local' },
      update: {
        firstName: 'Demo',
        lastName: 'Buyer',
        status: 'active'
      },
      create: {
        email: 'buyer@ruflo.local',
        firstName: 'Demo',
        lastName: 'Buyer',
        status: 'active'
      }
    });

    await this.prismaService.client.userRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: platformAdmin.id
        }
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: platformAdmin.id
      }
    });

    await this.prismaService.client.userRole.upsert({
      where: {
        userId_roleId: {
          userId: buyerUser.id,
          roleId: customerRole.id
        }
      },
      update: {},
      create: {
        userId: buyerUser.id,
        roleId: customerRole.id
      }
    });

    const tenant = await this.prismaService.client.tenant.findFirst({
      orderBy: { createdAt: 'asc' }
    });

    if (tenant) {
      await this.ensureMembership(tenant.id, adminUser.id, 'owner');
      await this.ensureMembership(tenant.id, buyerUser.id, 'member');
    }
  }

  private async ensureKeycloakRealm() {
    const adminUser = this.configService.get<string>('auth.adminUser') ?? process.env.KEYCLOAK_ADMIN_USER ?? 'admin';
    const adminPassword =
      this.configService.get<string>('auth.adminPassword') ?? process.env.KEYCLOAK_ADMIN_PASSWORD ?? 'change-me';
    const publicUrl = this.configService.get<string>('auth.publicUrl') ?? process.env.KEYCLOAK_PUBLIC_URL;
    const internalUrl = this.configService.get<string>('auth.internalUrl') ?? process.env.KEYCLOAK_INTERNAL_URL;
    const realm = this.configService.get<string>('auth.realm') ?? process.env.KEYCLOAK_REALM ?? 'ruflo';
    const adminAppUrl = this.configService.get<string>('auth.adminAppUrl') ?? process.env.ADMIN_APP_URL ?? 'http://localhost:3002';
    const webAppUrl = this.configService.get<string>('auth.webAppUrl') ?? process.env.WEB_APP_URL ?? 'http://localhost:3001';
    const adminClientId =
      this.configService.get<string>('auth.adminClientId') ?? process.env.KEYCLOAK_ADMIN_CLIENT_ID ?? 'ruflo-admin-ui';
    const adminClientSecret =
      this.configService.get<string>('auth.adminClientSecret') ??
      process.env.KEYCLOAK_ADMIN_CLIENT_SECRET ??
      'change-me-admin-client';
    const webClientId =
      this.configService.get<string>('auth.webClientId') ?? process.env.KEYCLOAK_WEB_CLIENT_ID ?? 'ruflo-web-ui';
    const webClientSecret =
      this.configService.get<string>('auth.webClientSecret') ??
      process.env.KEYCLOAK_WEB_CLIENT_SECRET ??
      'change-me-web-client';

    if (!internalUrl || !publicUrl) {
      this.logger.warn('Keycloak URLs are not configured; skipping realm bootstrap.');
      return;
    }

    try {
      const tokenResponse = await fetch(`${internalUrl}/realms/master/protocol/openid-connect/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: 'admin-cli',
          username: adminUser,
          password: adminPassword
        })
      });

      if (!tokenResponse.ok) {
        this.logger.warn(`Keycloak bootstrap skipped; unable to obtain admin token (${tokenResponse.status}).`);
        return;
      }

      const { access_token: accessToken } = (await tokenResponse.json()) as { access_token?: string };

      if (!accessToken) {
        this.logger.warn('Keycloak bootstrap skipped; admin token missing.');
        return;
      }

      const headers = {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json'
      };

      const realmResponse = await fetch(`${internalUrl}/admin/realms/${realm}`, { headers });

      if (realmResponse.status === 404) {
        await fetch(`${internalUrl}/admin/realms`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            realm,
            enabled: true,
            loginWithEmailAllowed: true,
            registrationAllowed: false,
            resetPasswordAllowed: true,
            duplicateEmailsAllowed: false
          })
        });
      }

      await this.ensureClient(internalUrl, headers, realm, adminClientId, adminClientSecret, adminAppUrl);
      await this.ensureClient(internalUrl, headers, realm, webClientId, webClientSecret, webAppUrl);

      await this.ensureUser(internalUrl, headers, realm, {
        username: 'platform-admin',
        email: 'admin@ruflo.local',
        firstName: 'Platform',
        lastName: 'Admin',
        password: 'change-me-admin'
      });

      await this.ensureUser(internalUrl, headers, realm, {
        username: 'demo-buyer',
        email: 'buyer@ruflo.local',
        firstName: 'Demo',
        lastName: 'Buyer',
        password: 'change-me-buyer'
      });
    } catch (error) {
      this.logger.warn(`Keycloak bootstrap skipped: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  private async ensureClient(
    internalUrl: string,
    headers: Record<string, string>,
    realm: string,
    clientId: string,
    clientSecret: string,
    appUrl: string
  ) {
    const clientsResponse = await fetch(
      `${internalUrl}/admin/realms/${realm}/clients?clientId=${encodeURIComponent(clientId)}`,
      { headers }
    );
    const clients = (await clientsResponse.json()) as Array<{ id: string }>;

    const payload = {
      clientId,
      enabled: true,
      protocol: 'openid-connect',
      publicClient: false,
      secret: clientSecret,
      standardFlowEnabled: true,
      directAccessGrantsEnabled: true,
      serviceAccountsEnabled: false,
      redirectUris: [`${appUrl}/auth/callback`, `${appUrl}/*`],
      webOrigins: [appUrl]
    };

    if (clients.length === 0) {
      await fetch(`${internalUrl}/admin/realms/${realm}/clients`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      return;
    }

    const client = clients[0];
    if (!client) {
      return;
    }

    await fetch(`${internalUrl}/admin/realms/${realm}/clients/${client.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        id: client.id,
        ...payload
      })
    });
  }

  private async ensureMembership(tenantId: string, userId: string, membershipType: 'owner' | 'member') {
    const existingMembership = await this.prismaService.client.membership.findFirst({
      where: {
        tenantId,
        userId,
        organizationId: null,
        orgUnitId: null
      }
    });

    if (existingMembership) {
      await this.prismaService.client.membership.update({
        where: { id: existingMembership.id },
        data: {
          status: 'active',
          membershipType
        }
      });
      return;
    }

    await this.prismaService.client.membership.create({
      data: {
        tenantId,
        userId,
        membershipType,
        status: 'active'
      }
    });
  }

  private async ensureUser(
    internalUrl: string,
    headers: Record<string, string>,
    realm: string,
    user: { username: string; email: string; firstName: string; lastName: string; password: string }
  ) {
    const usersResponse = await fetch(
      `${internalUrl}/admin/realms/${realm}/users?username=${encodeURIComponent(user.username)}`,
      { headers }
    );
    const users = (await usersResponse.json()) as Array<{ id: string }>;

    if (users.length === 0) {
      await fetch(`${internalUrl}/admin/realms/${realm}/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          enabled: true,
          emailVerified: true,
          credentials: [
            {
              type: 'password',
              value: user.password,
              temporary: false
            }
          ]
        })
      });
    }
  }
}
