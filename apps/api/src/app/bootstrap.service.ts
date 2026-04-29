import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service.js';
import { defaultAdminSettings } from '../modules/admin-ops/admin-ops.defaults.js';

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
  'customs.read',
  'customs.manage',
  'approval.read',
  'approval.manage',
  'admin.access'
];

const CUSTOMER_PERMISSIONS = ['catalog.read', 'retail.read', 'retail.manage', 'payment.read', 'payment.manage'];
const SUPPLIER_PERMISSIONS = [
  'catalog.read',
  'catalog.manage',
  'wholesale.read',
  'wholesale.manage',
  'contract.read',
  'retail.read',
  'retail.manage',
  'payment.read',
  'payment.manage'
];
const LOGISTICS_PERMISSIONS = ['logistics.read', 'logistics.manage', 'payment.read'];
const CUSTOMS_PERMISSIONS = ['customs.read', 'customs.manage', 'payment.read'];

@Injectable()
export class BootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  async onApplicationBootstrap() {
    await this.seedPermissions();
    await this.seedAdminSettings();
    await this.ensureOperationalActors();

    const bootstrapKeycloak =
      this.getConfigValue('auth.bootstrapOnStartup', process.env.KEYCLOAK_BOOTSTRAP_ON_STARTUP ?? 'false') === 'true';

    if (!bootstrapKeycloak) {
      this.logger.log('Skipping Keycloak bootstrap on startup.');
      return;
    }

    await this.ensureKeycloakRealm();
  }

  private async ensureOperationalActors() {
    const prisma = this.prismaService.client as any;

    const logisticsRole = await prisma.role.upsert({
      where: { code: 'logistics_company' },
      update: {
        name: 'Logistics Company'
      },
      create: {
        code: 'logistics_company',
        name: 'Logistics Company'
      }
    });

    const logisticsPermissions = await prisma.permission.findMany({
      where: {
        code: {
          in: LOGISTICS_PERMISSIONS
        }
      }
    });

    await prisma.rolePermission.deleteMany({
      where: { roleId: logisticsRole.id }
    });

    await prisma.rolePermission.createMany({
      data: logisticsPermissions.map((permission: { id: string }) => ({
        roleId: logisticsRole.id,
        permissionId: permission.id
      })),
      skipDuplicates: true
    });

    const customsRole = await prisma.role.upsert({
      where: { code: 'customs_broker' },
      update: {
        name: 'Customs Broker'
      },
      create: {
        code: 'customs_broker',
        name: 'Customs Broker'
      }
    });

    const customsPermissions = await prisma.permission.findMany({
      where: {
        code: {
          in: CUSTOMS_PERMISSIONS
        }
      }
    });

    await prisma.rolePermission.deleteMany({
      where: { roleId: customsRole.id }
    });

    await prisma.rolePermission.createMany({
      data: customsPermissions.map((permission: { id: string }) => ({
        roleId: customsRole.id,
        permissionId: permission.id
      })),
      skipDuplicates: true
    });

    const logisticsUser = await prisma.user.upsert({
      where: { email: 'logistics@ruflo.local' },
      update: {
        firstName: 'Logistics',
        lastName: 'Operator',
        status: 'active'
      },
      create: {
        email: 'logistics@ruflo.local',
        firstName: 'Logistics',
        lastName: 'Operator',
        status: 'active'
      }
    });

    const customsUser = await prisma.user.upsert({
      where: { email: 'customs@ruflo.local' },
      update: {
        firstName: 'Customs',
        lastName: 'Broker',
        status: 'active'
      },
      create: {
        email: 'customs@ruflo.local',
        firstName: 'Customs',
        lastName: 'Broker',
        status: 'active'
      }
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: logisticsUser.id,
          roleId: logisticsRole.id
        }
      },
      update: {},
      create: {
        userId: logisticsUser.id,
        roleId: logisticsRole.id
      }
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: customsUser.id,
          roleId: customsRole.id
        }
      },
      update: {},
      create: {
        userId: customsUser.id,
        roleId: customsRole.id
      }
    });

    const tenant = await prisma.tenant.upsert({
      where: { slug: 'ruflo-demo' },
      update: {
        name: 'Ruflo Demo Tenant',
        status: 'active'
      },
      create: {
        name: 'Ruflo Demo Tenant',
        slug: 'ruflo-demo',
        status: 'active'
      }
    });

    await this.ensurePartnerOrganizationSeed(tenant.id, logisticsUser.id, 'logistics_company', 'Atlas Logistics');
    await this.ensurePartnerOrganizationSeed(tenant.id, customsUser.id, 'customs_broker', 'Atlas Customs');
    await this.ensurePartnerRegistrySeed(tenant.id);
    await this.ensureDemoOperationalAssignmentSeeds(tenant.id);

    const internalUrl = this.getConfigValue('auth.internalUrl', process.env.KEYCLOAK_INTERNAL_URL);
    const publicUrl = this.getConfigValue('auth.publicUrl', process.env.KEYCLOAK_PUBLIC_URL);
    const realm = this.getConfigValue('auth.realm', process.env.KEYCLOAK_REALM ?? 'ruflo');

    if (!internalUrl || !publicUrl) {
      return;
    }

    try {
      const adminUser = this.getConfigValue('auth.adminUser', process.env.KEYCLOAK_ADMIN_USER ?? 'admin') ?? 'admin';
      const adminPassword =
        this.getConfigValue('auth.adminPassword', process.env.KEYCLOAK_ADMIN_PASSWORD ?? 'change-me') ?? 'change-me';
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
        this.logger.warn(`Operational actor bootstrap skipped; unable to obtain admin token (${tokenResponse.status}).`);
        return;
      }

      const { access_token: accessToken } = (await tokenResponse.json()) as { access_token?: string };

      if (!accessToken) {
        this.logger.warn('Operational actor bootstrap skipped; admin token missing.');
        return;
      }

      const headers = {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json'
      };

      await this.ensureUser(internalUrl!, headers, realm!, {
        username: 'atlas-logistics',
        email: 'logistics@ruflo.local',
        firstName: 'Logistics',
        lastName: 'Operator',
        password: 'change-me-logistics'
      });

      await this.ensureUser(internalUrl!, headers, realm!, {
        username: 'atlas-customs',
        email: 'customs@ruflo.local',
        firstName: 'Customs',
        lastName: 'Broker',
        password: 'change-me-customs'
      });
    } catch (error) {
      this.logger.warn(`Operational actor bootstrap skipped: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
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
          in: CUSTOMER_PERMISSIONS
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

    const supplierRole = await this.prismaService.client.role.upsert({
      where: { code: 'supplier_user' },
      update: {
        name: 'Supplier User'
      },
      create: {
        code: 'supplier_user',
        name: 'Supplier User'
      }
    });

    const supplierPermissions = await this.prismaService.client.permission.findMany({
      where: {
        code: {
          in: SUPPLIER_PERMISSIONS
        }
      }
    });

    await this.prismaService.client.rolePermission.deleteMany({
      where: { roleId: supplierRole.id }
    });

    await this.prismaService.client.rolePermission.createMany({
      data: supplierPermissions.map((permission) => ({
        roleId: supplierRole.id,
        permissionId: permission.id
      })),
      skipDuplicates: true
    });

    const logisticsRole = await this.prismaService.client.role.upsert({
      where: { code: 'logistics_company' },
      update: {
        name: 'Logistics Company'
      },
      create: {
        code: 'logistics_company',
        name: 'Logistics Company'
      }
    });

    const logisticsPermissions = await this.prismaService.client.permission.findMany({
      where: {
        code: {
          in: LOGISTICS_PERMISSIONS
        }
      }
    });

    await this.prismaService.client.rolePermission.deleteMany({
      where: { roleId: logisticsRole.id }
    });

    await this.prismaService.client.rolePermission.createMany({
      data: logisticsPermissions.map((permission) => ({
        roleId: logisticsRole.id,
        permissionId: permission.id
      })),
      skipDuplicates: true
    });

    const customsRole = await this.prismaService.client.role.upsert({
      where: { code: 'customs_broker' },
      update: {
        name: 'Customs Broker'
      },
      create: {
        code: 'customs_broker',
        name: 'Customs Broker'
      }
    });

    const customsPermissions = await this.prismaService.client.permission.findMany({
      where: {
        code: {
          in: CUSTOMS_PERMISSIONS
        }
      }
    });

    await this.prismaService.client.rolePermission.deleteMany({
      where: { roleId: customsRole.id }
    });

    await this.prismaService.client.rolePermission.createMany({
      data: customsPermissions.map((permission) => ({
        roleId: customsRole.id,
        permissionId: permission.id
      })),
      skipDuplicates: true
    });

    const adminEmail = process.env.KEYCLOAK_BOOTSTRAP_ADMIN_EMAIL ?? 'admin@ruflo.local';
    const adminUser = await this.prismaService.client.user.upsert({
      where: { email: adminEmail },
      update: {
        firstName: 'Platform',
        lastName: 'Admin',
        status: 'active'
      },
      create: {
        email: adminEmail,
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

    const supplierUser = await this.prismaService.client.user.upsert({
      where: { email: 'supplier@ruflo.local' },
      update: {
        firstName: 'Atlas',
        lastName: 'Supplier',
        status: 'active'
      },
      create: {
        email: 'supplier@ruflo.local',
        firstName: 'Atlas',
        lastName: 'Supplier',
        status: 'active'
      }
    });

    const logisticsUser = await this.prismaService.client.user.upsert({
      where: { email: 'logistics@ruflo.local' },
      update: {
        firstName: 'Logistics',
        lastName: 'Operator',
        status: 'active'
      },
      create: {
        email: 'logistics@ruflo.local',
        firstName: 'Logistics',
        lastName: 'Operator',
        status: 'active'
      }
    });

    const customsUser = await this.prismaService.client.user.upsert({
      where: { email: 'customs@ruflo.local' },
      update: {
        firstName: 'Customs',
        lastName: 'Broker',
        status: 'active'
      },
      create: {
        email: 'customs@ruflo.local',
        firstName: 'Customs',
        lastName: 'Broker',
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
          userId: supplierUser.id,
          roleId: supplierRole.id
        }
      },
      update: {},
      create: {
        userId: supplierUser.id,
        roleId: supplierRole.id
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

    await this.prismaService.client.userRole.upsert({
      where: {
        userId_roleId: {
          userId: logisticsUser.id,
          roleId: logisticsRole.id
        }
      },
      update: {},
      create: {
        userId: logisticsUser.id,
        roleId: logisticsRole.id
      }
    });

    await this.prismaService.client.userRole.upsert({
      where: {
        userId_roleId: {
          userId: customsUser.id,
          roleId: customsRole.id
        }
      },
      update: {},
      create: {
        userId: customsUser.id,
        roleId: customsRole.id
      }
    });

    const tenant = await this.prismaService.client.tenant.upsert({
      where: { slug: 'ruflo-demo' },
      update: {
        name: 'Ruflo Demo Tenant',
        status: 'active'
      },
      create: {
        name: 'Ruflo Demo Tenant',
        slug: 'ruflo-demo',
        status: 'active'
      }
    });

    await this.ensureMembership(tenant.id, adminUser.id, 'owner');
    await this.ensureMembership(tenant.id, buyerUser.id, 'member');
    await this.ensureMembership(tenant.id, supplierUser.id, 'member');
    await this.ensurePartnerOrganizationSeed(tenant.id, logisticsUser.id, 'logistics_company', 'Atlas Logistics');
    await this.ensurePartnerOrganizationSeed(tenant.id, customsUser.id, 'customs_broker', 'Atlas Customs');
    await this.ensurePartnerRegistrySeed(tenant.id);
    await this.ensureBuyerProfileSeed(tenant.id, buyerUser.id);
    await this.ensureDemoSellerSeed(tenant.id, adminUser.id);
    await this.ensureSupplierCatalogSeed(tenant.id, supplierUser.id);
    await this.ensureDemoOperationalAssignmentSeeds(tenant.id);
  }

  private async seedAdminSettings() {
    for (const setting of defaultAdminSettings) {
      await this.prismaService.client.adminSetting.upsert({
        where: { key: setting.key },
        update: {
          section: setting.section,
          value: setting.value
        },
        create: {
          key: setting.key,
          section: setting.section,
          value: setting.value
        }
      });
    }
  }

  private async ensureKeycloakRealm() {
    const adminUser = this.configService.get<string>('auth.adminUser') ?? process.env.KEYCLOAK_ADMIN_USER ?? 'admin';
    const adminPassword =
      this.configService.get<string>('auth.adminPassword') ?? process.env.KEYCLOAK_ADMIN_PASSWORD ?? 'change-me';
    const publicUrl = this.configService.get<string>('auth.publicUrl') ?? process.env.KEYCLOAK_PUBLIC_URL;
    const internalUrl = this.configService.get<string>('auth.internalUrl') ?? process.env.KEYCLOAK_INTERNAL_URL;
    const realm = this.configService.get<string>('auth.realm') ?? process.env.KEYCLOAK_REALM ?? 'ruflo';
    const adminAppUrl =
      this.configService.get<string>('auth.adminAppUrl') ??
      process.env.ADMIN_URL ??
      process.env.ADMIN_APP_URL ??
      'http://localhost:3002';
    const webAppUrl =
      this.configService.get<string>('auth.webAppUrl') ??
      process.env.WEB_URL ??
      process.env.WEB_APP_URL ??
      'http://localhost:3001';
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

      const bootstrapAdminEmail =
        this.getConfigValue('auth.bootstrapAdminEmail', process.env.KEYCLOAK_BOOTSTRAP_ADMIN_EMAIL) ?? 'admin@ruflo.local';
      const bootstrapAdminPassword =
        this.getConfigValue('auth.bootstrapAdminPassword', process.env.KEYCLOAK_BOOTSTRAP_ADMIN_PASSWORD) ?? 'change-me-admin';

      await this.ensureUser(internalUrl, headers, realm, {
        username: 'platform-admin',
        email: bootstrapAdminEmail,
        firstName: 'Platform',
        lastName: 'Admin',
        password: bootstrapAdminPassword
      });

      await this.ensureUser(internalUrl, headers, realm, {
        username: 'demo-buyer',
        email: 'buyer@ruflo.local',
        firstName: 'Demo',
        lastName: 'Buyer',
        password: 'change-me-buyer'
      });

      await this.ensureUser(internalUrl, headers, realm, {
        username: 'atlas-supplier',
        email: 'supplier@ruflo.local',
        firstName: 'Atlas',
        lastName: 'Supplier',
        password: 'change-me-supplier'
      });

      await this.ensureUser(internalUrl, headers, realm, {
        username: 'atlas-logistics',
        email: 'logistics@ruflo.local',
        firstName: 'Logistics',
        lastName: 'Operator',
        password: 'change-me-logistics'
      });

      await this.ensureUser(internalUrl, headers, realm, {
        username: 'atlas-customs',
        email: 'customs@ruflo.local',
        firstName: 'Customs',
        lastName: 'Broker',
        password: 'change-me-customs'
      });
    } catch (error) {
      this.logger.warn(`Keycloak bootstrap skipped: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  private async ensureSupplierCatalogSeed(tenantId: string, supplierUserId: string) {
    const sellerProfile = await this.prismaService.client.sellerProfile.upsert({
      where: {
        id: 'phase16-atlas-supplier-profile'
      },
      update: {
        userId: supplierUserId,
        tenantId,
        sellerType: 'business',
        supplierType: 'trader',
        displayName: 'Atlas Components',
        companyName: 'Atlas Components LLC',
        country: 'Kazakhstan',
        status: 'active',
        onboardingStatus: 'approved',
        submittedAt: new Date(),
        reviewedAt: new Date(),
        reviewedByUserId: supplierUserId,
        reviewNote: 'Bootstrap approved'
      },
      create: {
        id: 'phase16-atlas-supplier-profile',
        userId: supplierUserId,
        tenantId,
        sellerType: 'business',
        supplierType: 'trader',
        displayName: 'Atlas Components',
        companyName: 'Atlas Components LLC',
        country: 'Kazakhstan',
        status: 'active',
        onboardingStatus: 'approved',
        submittedAt: new Date(),
        reviewedAt: new Date(),
        reviewedByUserId: supplierUserId,
        reviewNote: 'Bootstrap approved'
      }
    });

    const category = await this.ensureDemoCategory();

    await this.prismaService.client.product.upsert({
      where: { slug: 'atlas-escrow-sensor' },
      update: {
        sellerProfileId: sellerProfile.id,
        categoryId: category.id,
        sku: 'ATLAS-SENSOR-001',
        name: 'Atlas Escrow Sensor',
        description: 'Supplier-seeded product for real RFQ to quote validation.',
        status: 'published',
        targetMarket: 'b2b'
      },
      create: {
        sellerProfileId: sellerProfile.id,
        categoryId: category.id,
        slug: 'atlas-escrow-sensor',
        sku: 'ATLAS-SENSOR-001',
        name: 'Atlas Escrow Sensor',
        description: 'Supplier-seeded product for real RFQ to quote validation.',
        status: 'published',
        targetMarket: 'b2b',
        prices: {
          create: {
            currency: 'USD',
            amountMinor: 249900,
            isActive: true
          }
        }
      }
    });

    await this.prismaService.client.product.upsert({
      where: { slug: 'atlas-office-headphones' },
      update: {
        sellerProfileId: sellerProfile.id,
        categoryId: category.id,
        sku: 'ATLAS-HEADPHONES-001',
        name: 'Atlas Office Headphones',
        description: 'Bootstrap-created consumer product for cart, checkout, payment, and delivery validation.',
        status: 'published',
        targetMarket: 'b2c'
      },
      create: {
        sellerProfileId: sellerProfile.id,
        categoryId: category.id,
        slug: 'atlas-office-headphones',
        sku: 'ATLAS-HEADPHONES-001',
        name: 'Atlas Office Headphones',
        description: 'Bootstrap-created consumer product for cart, checkout, payment, and delivery validation.',
        status: 'published',
        targetMarket: 'b2c',
        prices: {
          create: {
            currency: 'USD',
            amountMinor: 19900,
            isActive: true
          }
        }
      }
    });
  }

  private async ensureBuyerProfileSeed(tenantId: string, buyerUserId: string) {
    await this.prismaService.client.buyerProfile.upsert({
      where: {
        id: 'phase16-demo-buyer-profile'
      },
      update: {
        userId: buyerUserId,
        tenantId,
        buyerType: 'business',
        displayName: 'Ruflo Demo Buyer',
        status: 'active',
        b2bStatus: 'approved',
        b2bSubmittedAt: new Date(),
        b2bReviewedAt: new Date(),
        b2bReviewedByUserId: buyerUserId,
        b2bReviewNote: 'Bootstrap approved'
      },
      create: {
        id: 'phase16-demo-buyer-profile',
        userId: buyerUserId,
        tenantId,
        buyerType: 'business',
        displayName: 'Ruflo Demo Buyer',
        status: 'active',
        b2bStatus: 'approved',
        b2bSubmittedAt: new Date(),
        b2bReviewedAt: new Date(),
        b2bReviewedByUserId: buyerUserId,
        b2bReviewNote: 'Bootstrap approved'
      }
    });
  }

  private async ensureDemoSellerSeed(tenantId: string, adminUserId: string) {
    const sellerProfile = await this.prismaService.client.sellerProfile.upsert({
      where: {
        id: 'phase16-demo-seller-profile'
      },
      update: {
        userId: adminUserId,
        tenantId,
        sellerType: 'business',
        supplierType: 'manufacturer',
        displayName: 'Ruflo Demo Seller',
        companyName: 'Ruflo Demo Seller LLC',
        country: 'Kazakhstan',
        status: 'active',
        onboardingStatus: 'approved',
        submittedAt: new Date(),
        reviewedAt: new Date(),
        reviewedByUserId: adminUserId,
        reviewNote: 'Bootstrap approved'
      },
      create: {
        id: 'phase16-demo-seller-profile',
        userId: adminUserId,
        tenantId,
        sellerType: 'business',
        supplierType: 'manufacturer',
        displayName: 'Ruflo Demo Seller',
        companyName: 'Ruflo Demo Seller LLC',
        country: 'Kazakhstan',
        status: 'active',
        onboardingStatus: 'approved',
        submittedAt: new Date(),
        reviewedAt: new Date(),
        reviewedByUserId: adminUserId,
        reviewNote: 'Bootstrap approved'
      }
    });

    const category = await this.ensureDemoCategory();

    await this.prismaService.client.product.upsert({
      where: { slug: 'ruflo-demo-laptop' },
      update: {
        sellerProfileId: sellerProfile.id,
        categoryId: category.id,
        sku: 'RUFLO-LAPTOP-001',
        name: 'Ruflo Demo Laptop',
        description: 'Demo marketplace product for buyer and supplier flow validation.',
        status: 'published',
        targetMarket: 'b2b'
      },
      create: {
        sellerProfileId: sellerProfile.id,
        categoryId: category.id,
        slug: 'ruflo-demo-laptop',
        sku: 'RUFLO-LAPTOP-001',
        name: 'Ruflo Demo Laptop',
        description: 'Demo marketplace product for buyer and supplier flow validation.',
        status: 'published',
        targetMarket: 'b2b',
        prices: {
          create: {
            currency: 'USD',
            amountMinor: 129900,
            isActive: true
          }
        }
      }
    });
  }

  private async ensurePartnerRegistrySeed(tenantId: string) {
    const prisma = this.prismaService.client as any;
    const registrySeeds = [
      {
        id: 'phase23-insurance-partner',
        name: 'Atlas Insurance',
        legalName: 'Atlas Insurance Ltd',
        partnerType: 'insurance_company' as const,
        contactName: 'Atlas Insurance Desk'
      },
      {
        id: 'phase23-surveyor-partner',
        name: 'Atlas Surveyors',
        legalName: 'Atlas Surveyors LLC',
        partnerType: 'surveyor' as const,
        contactName: 'Atlas Survey Desk'
      },
      {
        id: 'phase23-bank-partner',
        name: 'Atlas Bank',
        legalName: 'Atlas Bank PLC',
        partnerType: 'bank' as const,
        contactName: 'Atlas Bank Desk'
      }
    ];

    for (const seed of registrySeeds) {
      await prisma.organization.upsert({
        where: { id: seed.id },
        update: {
          tenantId,
          name: seed.name,
          legalName: seed.legalName,
          partnerType: seed.partnerType,
          status: 'active',
          onboardingStatus: 'approved',
          linkedUserId: null,
          contactName: seed.contactName,
          contactEmail: 'partners@ruflo.local',
          contactPhone: '+1 555 0100',
          address: '1 Partner Avenue, Commerce City',
          country: 'Kazakhstan',
          submittedAt: new Date(),
          reviewedAt: new Date(),
          reviewedByUserId: null,
          reviewNote: 'Bootstrap approved',
          notes: 'Admin-managed partner registry seed.'
        },
        create: {
          id: seed.id,
          tenantId,
          name: seed.name,
          legalName: seed.legalName,
          partnerType: seed.partnerType,
          status: 'active',
          onboardingStatus: 'approved',
          linkedUserId: null,
          contactName: seed.contactName,
          contactEmail: 'partners@ruflo.local',
          contactPhone: '+1 555 0100',
          address: '1 Partner Avenue, Commerce City',
          country: 'Kazakhstan',
          submittedAt: new Date(),
          reviewedAt: new Date(),
          reviewedByUserId: null,
          reviewNote: 'Bootstrap approved',
          notes: 'Admin-managed partner registry seed.'
        }
      });
    }
  }

  private async ensurePartnerOrganizationSeed(
    tenantId: string,
    userId: string,
    partnerType: 'logistics_company' | 'customs_broker',
    displayName: string
  ) {
    const prisma = this.prismaService.client as any;
    const organizationId = partnerType === 'logistics_company' ? 'phase23-logistics-partner' : 'phase23-customs-partner';
    const organization = await prisma.organization.upsert({
      where: { id: organizationId },
        update: {
          tenantId,
          name: displayName,
          legalName: `${displayName} Ltd`,
          partnerType,
          status: 'active',
          onboardingStatus: 'approved',
          linkedUserId: userId,
          contactName: displayName,
        contactEmail: `${partnerType.startsWith('logistics') ? 'logistics' : 'customs'}@ruflo.local`,
        contactPhone: '+1 555 0101',
        address: '1 Operations Way, Commerce City',
        country: 'Kazakhstan',
        submittedAt: new Date(),
        reviewedAt: new Date(),
        reviewedByUserId: userId,
        reviewNote: 'Bootstrap approved',
        notes: `Seeded ${partnerType} partner.`
      },
        create: {
          id: organizationId,
          tenantId,
          name: displayName,
          legalName: `${displayName} Ltd`,
          partnerType,
          status: 'active',
          onboardingStatus: 'approved',
          linkedUserId: userId,
          contactName: displayName,
        contactEmail: `${partnerType.startsWith('logistics') ? 'logistics' : 'customs'}@ruflo.local`,
        contactPhone: '+1 555 0101',
        address: '1 Operations Way, Commerce City',
        country: 'Kazakhstan',
        submittedAt: new Date(),
        reviewedAt: new Date(),
        reviewedByUserId: userId,
        reviewNote: 'Bootstrap approved',
        notes: `Seeded ${partnerType} partner.`
      }
    });

    const existingMembership = await prisma.membership.findFirst({
      where: {
        tenantId,
        userId,
        organizationId: organization.id,
        orgUnitId: null
      }
    });

    if (existingMembership) {
      await prisma.membership.update({
        where: { id: existingMembership.id },
        data: {
          membershipType: 'owner',
          status: 'active'
        }
      });
      return;
    }

    await prisma.membership.create({
      data: {
        tenantId,
        userId,
        organizationId: organization.id,
        membershipType: 'owner',
        status: 'active'
      }
    });
  }

  private async ensureDemoOperationalAssignmentSeeds(tenantId: string) {
    const prisma = this.prismaService.client as any;
    const [wholesaleDeal, retailOrder, logisticsOrganization, customsOrganization] = await Promise.all([
      prisma.wholesaleDeal.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { id: true }
      }),
      prisma.retailOrder.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { id: true }
      }),
      prisma.organization.findFirst({
        where: { tenantId, partnerType: 'logistics_company' },
        select: { id: true }
      }),
      prisma.organization.findFirst({
        where: { tenantId, partnerType: 'customs_broker' },
        select: { id: true }
      })
    ]);

    if (wholesaleDeal && logisticsOrganization) {
      await prisma.operationalAssignment.upsert({
        where: { id: 'phase23-demo-shipment-assignment' },
        update: {
          tenantId,
          kind: 'shipment',
          subjectType: 'wholesale-deal',
          subjectId: wholesaleDeal.id,
          partnerOrganizationId: logisticsOrganization.id,
          status: 'accepted',
          reference: `SHIP-${wholesaleDeal.id.slice(0, 8).toUpperCase()}`,
          notes: 'Bootstrap shipment assignment.'
        },
        create: {
          id: 'phase23-demo-shipment-assignment',
          tenantId,
          kind: 'shipment',
          subjectType: 'wholesale-deal',
          subjectId: wholesaleDeal.id,
          partnerOrganizationId: logisticsOrganization.id,
          status: 'accepted',
          reference: `SHIP-${wholesaleDeal.id.slice(0, 8).toUpperCase()}`,
          notes: 'Bootstrap shipment assignment.'
        }
      });
    }

    if (retailOrder && customsOrganization) {
      await prisma.operationalAssignment.upsert({
        where: { id: 'phase23-demo-customs-assignment' },
        update: {
          tenantId,
          kind: 'customs',
          subjectType: 'retail-order',
          subjectId: retailOrder.id,
          partnerOrganizationId: customsOrganization.id,
          status: 'documents_requested',
          reference: `CUS-${retailOrder.id.slice(0, 8).toUpperCase()}`,
          notes: 'Bootstrap customs assignment.'
        },
        create: {
          id: 'phase23-demo-customs-assignment',
          tenantId,
          kind: 'customs',
          subjectType: 'retail-order',
          subjectId: retailOrder.id,
          partnerOrganizationId: customsOrganization.id,
          status: 'documents_requested',
          reference: `CUS-${retailOrder.id.slice(0, 8).toUpperCase()}`,
          notes: 'Bootstrap customs assignment.'
        }
      });
    }
  }

  private async ensureDemoCategory() {
    return (
      (await this.prismaService.client.category.findFirst({
        orderBy: { createdAt: 'asc' }
      })) ??
      this.prismaService.client.category.create({
        data: {
          slug: 'industrial-electronics',
          name: 'Industrial Electronics',
          description: 'Bootstrap-created marketplace category.'
        }
      })
    );
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

    const redirectUris = this.buildAllowedRedirectUris(appUrl);
    const webOrigins = this.buildAllowedWebOrigins(appUrl);

    const payload = {
      clientId,
      enabled: true,
      protocol: 'openid-connect',
      publicClient: false,
      secret: clientSecret,
      standardFlowEnabled: true,
      directAccessGrantsEnabled: true,
      serviceAccountsEnabled: false,
      rootUrl: this.buildClientRootUrl(appUrl),
      baseUrl: this.buildClientBaseUrl(appUrl),
      redirectUris,
      webOrigins
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

  private buildAllowedRedirectUris(appUrl: string) {
    const urls = new Set<string>([appUrl, `${appUrl}/auth/callback`, `${appUrl}/*`]);
    const rootUrl = this.buildClientRootUrl(appUrl);
    const baseUrl = this.buildClientBaseUrl(appUrl);

    if (this.isLocalRuntimeUrl(appUrl)) {
      const localhostVariants = this.buildLocalhostUrlVariants(appUrl);
      for (const variant of localhostVariants) {
        urls.add(variant);
        urls.add(`${variant}/auth/callback`);
        urls.add(`${variant}/*`);
      }

      if (baseUrl !== '/') {
        for (const originVariant of this.buildLocalhostUrlVariants(rootUrl)) {
          const scopedVariant = `${originVariant}${baseUrl}`;
          urls.add(scopedVariant);
          urls.add(`${scopedVariant}/auth/callback`);
          urls.add(`${scopedVariant}/*`);
        }
      }
    }

    return [...urls];
  }

  private buildAllowedWebOrigins(appUrl: string) {
    const origins = new Set<string>([this.buildClientRootUrl(appUrl)]);

    if (this.isLocalRuntimeUrl(appUrl)) {
      for (const variant of this.buildLocalhostUrlVariants(this.buildClientRootUrl(appUrl))) {
        origins.add(new URL(variant).origin);
      }
    }

    return [...origins];
  }

  private buildLocalhostUrlVariants(appUrl: string) {
    const parsedUrl = new URL(appUrl);
    const port =
      parsedUrl.port ||
      (parsedUrl.pathname.startsWith('/admin') ? '3002' : '') ||
      (appUrl.includes(':3002') ? '3002' : appUrl.includes(':3001') ? '3001' : '3001');
    const pathSuffix = parsedUrl.pathname === '/' ? '' : parsedUrl.pathname.replace(/\/$/, '');

    if (!port) {
      return [];
    }

    return [`http://localhost:${port}${pathSuffix}`, `http://127.0.0.1:${port}${pathSuffix}`];
  }

  private isLocalRuntimeUrl(appUrl: string) {
    const parsedUrl = new URL(appUrl);
    return /^(localhost|127\.0\.0\.1|::1)$/i.test(parsedUrl.hostname);
  }

  private buildClientRootUrl(appUrl: string) {
    return new URL(appUrl).origin;
  }

  private buildClientBaseUrl(appUrl: string) {
    const path = new URL(appUrl).pathname.replace(/\/$/, '');
    return path || '/';
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
