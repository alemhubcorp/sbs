import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { AuthContext, RequestAuditContext } from '../../app/auth-context.js';
import { AuditService } from '../audit-observability/audit.service.js';
import { ResourceAccessService } from '../../app/resource-access.service.js';
import { TenantOrgRepository } from './tenant-org.repository.js';

const createTenantSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  organizationName: z.string().min(1).max(120),
  legalName: z.string().min(1).max(200).optional(),
  ownerUserId: z.string().min(1).optional()
});

const createOrganizationSchema = z.object({
  name: z.string().min(1).max(120),
  legalName: z.string().min(1).max(200).optional(),
  partnerType: z.enum(['logistics_company', 'customs_broker', 'insurance_company', 'surveyor', 'bank']).optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
  linkedUserId: z.string().min(1).optional().nullable(),
  contactName: z.string().min(1).max(120).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().min(1).max(40).optional(),
  address: z.string().min(1).max(250).optional(),
  country: z.string().min(1).max(80).optional(),
  notes: z.string().max(1000).optional()
});

const updateOrganizationSchema = createOrganizationSchema.partial().extend({
  name: z.string().min(1).max(120).optional()
});

const createOrgUnitSchema = z.object({
  organizationId: z.string().min(1),
  parentId: z.string().min(1).optional(),
  name: z.string().min(1).max(120),
  code: z.string().min(1).max(64).optional()
});

const createMembershipSchema = z.object({
  userId: z.string().min(1),
  organizationId: z.string().min(1).optional(),
  orgUnitId: z.string().min(1).optional(),
  membershipType: z.enum(['owner', 'admin', 'member', 'viewer']).default('member'),
  status: z.enum(['active', 'invited', 'suspended']).default('active')
});

@Injectable()
export class TenantOrgService {
  constructor(
    @Inject(TenantOrgRepository) private readonly tenantOrgRepository: TenantOrgRepository,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(ResourceAccessService) private readonly resourceAccessService: ResourceAccessService
  ) {}

  async listTenants(authContext: AuthContext) {
    const tenants = await this.tenantOrgRepository.listTenants();
    return this.resourceAccessService.filterByTenant(authContext, tenants, (tenant) => tenant.id);
  }

  async getTenantById(id: string, authContext: AuthContext) {
    this.resourceAccessService.ensureTenantAccess(authContext, id);
    return this.tenantOrgRepository.getTenantById(id);
  }

  async createTenant(input: unknown, auditContext: RequestAuditContext) {
    const tenant = await this.tenantOrgRepository.createTenant(createTenantSchema.parse(input));

    await this.auditService.record({
      module: 'tenant-org',
      eventType: 'tenant.created',
      actorId: auditContext.actorId,
      tenantId: tenant.id,
      correlationId: auditContext.correlationId,
      subjectType: 'tenant',
      subjectId: tenant.id,
      payload: {
        slug: tenant.slug,
        organizationIds: tenant.organizations.map((organization) => organization.id)
      }
    });

    return tenant;
  }

  listOrganizations(tenantId: string, authContext: AuthContext) {
    this.resourceAccessService.ensureTenantAccess(authContext, tenantId);
    return this.tenantOrgRepository.listOrganizations(tenantId);
  }

  async createOrganization(
    tenantId: string,
    input: unknown,
    auditContext: RequestAuditContext,
    authContext: AuthContext
  ) {
    this.resourceAccessService.ensureTenantAccess(authContext, tenantId);
    const parsed = createOrganizationSchema.parse(input);

    const organization = await this.tenantOrgRepository.createOrganization({
      tenantId,
      ...parsed
    });

    await this.auditService.record({
      module: 'tenant-org',
      eventType: 'tenant.organization.created',
      actorId: auditContext.actorId,
      tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'organization',
      subjectId: organization.id,
      payload: {
        name: organization.name
      }
    });

    return organization;
  }

  async updateOrganization(
    tenantId: string,
    organizationId: string,
    input: unknown,
    auditContext: RequestAuditContext,
    authContext: AuthContext
  ) {
    this.resourceAccessService.ensureTenantAccess(authContext, tenantId);
    const parsed = updateOrganizationSchema.parse(input);
    await this.resourceAccessService.ensureOrganizationAccess(authContext, organizationId);

    const organization = await this.tenantOrgRepository.updateOrganization({
      tenantId,
      organizationId,
      ...parsed
    });

    await this.auditService.record({
      module: 'tenant-org',
      eventType: 'tenant.organization.updated',
      actorId: auditContext.actorId,
      tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'organization',
      subjectId: organization.id,
      payload: {
        name: organization.name,
        partnerType: (organization as any).partnerType,
        status: (organization as any).status
      }
    });

    return organization;
  }

  listOrgUnits(tenantId: string, authContext: AuthContext) {
    this.resourceAccessService.ensureTenantAccess(authContext, tenantId);
    return this.tenantOrgRepository.listOrgUnits(tenantId);
  }

  async createOrgUnit(tenantId: string, input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    this.resourceAccessService.ensureTenantAccess(authContext, tenantId);
    const parsed = createOrgUnitSchema.parse(input);
    await this.resourceAccessService.ensureOrganizationAccess(authContext, parsed.organizationId);

    const orgUnit = await this.tenantOrgRepository.createOrgUnit({
      tenantId,
      ...parsed
    });

    await this.auditService.record({
      module: 'tenant-org',
      eventType: 'tenant.org-unit.created',
      actorId: auditContext.actorId,
      tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'org-unit',
      subjectId: orgUnit.id,
      payload: {
        organizationId: orgUnit.organizationId,
        parentId: orgUnit.parentId,
        code: orgUnit.code
      }
    });

    return orgUnit;
  }

  listMemberships(tenantId: string, authContext: AuthContext) {
    this.resourceAccessService.ensureTenantAccess(authContext, tenantId);
    return this.tenantOrgRepository.listMemberships(tenantId);
  }

  async createMembership(tenantId: string, input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    this.resourceAccessService.ensureTenantAccess(authContext, tenantId);
    const parsed = createMembershipSchema.parse(input);
    if (parsed.organizationId) {
      await this.resourceAccessService.ensureOrganizationAccess(authContext, parsed.organizationId);
    }

    const membership = await this.tenantOrgRepository.createMembership({
      tenantId,
      ...parsed
    });

    await this.auditService.record({
      module: 'tenant-org',
      eventType: 'tenant.membership.created',
      actorId: auditContext.actorId,
      tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'membership',
      subjectId: membership.id,
      payload: {
        userId: membership.userId,
        organizationId: membership.organizationId,
        orgUnitId: membership.orgUnitId,
        membershipType: membership.membershipType,
        status: membership.status
      }
    });

    return membership;
  }
}
