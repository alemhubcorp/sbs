import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../app/prisma.service.js';

export interface CreateTenantRecordInput {
  name: string;
  slug: string;
  organizationName: string;
  legalName?: string | undefined;
  ownerUserId?: string | undefined;
}

export interface CreateOrganizationRecordInput {
  tenantId: string;
  name: string;
  legalName?: string | undefined;
  partnerType?: 'logistics_company' | 'customs_broker' | 'insurance_company' | 'surveyor' | 'bank' | null | undefined;
  status?: 'active' | 'inactive' | undefined;
  linkedUserId?: string | null | undefined;
  contactName?: string | undefined;
  contactEmail?: string | undefined;
  contactPhone?: string | undefined;
  address?: string | undefined;
  country?: string | undefined;
  notes?: string | undefined;
}

export interface UpdateOrganizationRecordInput extends Omit<CreateOrganizationRecordInput, 'name'> {
  organizationId: string;
  name?: string | undefined;
}

export interface CreateOrgUnitRecordInput {
  tenantId: string;
  organizationId: string;
  parentId?: string | undefined;
  name: string;
  code?: string | undefined;
}

export interface CreateMembershipRecordInput {
  tenantId: string;
  userId: string;
  organizationId?: string | undefined;
  orgUnitId?: string | undefined;
  membershipType: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'invited' | 'suspended';
}

@Injectable()
export class TenantOrgRepository {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async listTenants() {
    return this.prismaService.client.tenant.findMany({
      include: {
        organizations: {
          include: {
            linkedUser: true
          }
        },
        memberships: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getTenantById(id: string) {
    const tenant = await this.prismaService.client.tenant.findUnique({
      where: { id },
      include: {
        organizations: {
          include: {
            linkedUser: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        memberships: {
          include: {
            user: true,
            organization: true,
            orgUnit: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${id} was not found.`);
    }

    return tenant;
  }

  async createTenant(input: CreateTenantRecordInput) {
    try {
      return await this.prismaService.client.$transaction(async (tx) => {
        if (input.ownerUserId) {
          const owner = await tx.user.findUnique({
            where: {
              id: input.ownerUserId
            },
            select: {
              id: true
            }
          });

          if (!owner) {
            throw new NotFoundException(`User ${input.ownerUserId} was not found.`);
          }
        }

        const tenant = await tx.tenant.create({
          data: {
            name: input.name,
            slug: input.slug,
            status: 'active'
          }
        });

        const organization = await tx.organization.create({
          data: {
            tenantId: tenant.id,
            name: input.organizationName,
            ...(input.legalName ? { legalName: input.legalName } : {})
          }
        });

        if (input.ownerUserId) {
          await tx.membership.create({
            data: {
              tenantId: tenant.id,
              userId: input.ownerUserId,
              organizationId: organization.id,
              membershipType: 'owner',
              status: 'active'
            }
          });
        }

        return tx.tenant.findUniqueOrThrow({
          where: { id: tenant.id },
          include: {
            organizations: {
              include: {
                linkedUser: true
              }
            },
            memberships: {
              include: {
                user: true,
                organization: true
              }
            }
          }
        });
      });
    } catch (error) {
      this.handlePrismaConflict(error, 'Tenant could not be created.');
    }
  }

  async listOrganizations(tenantId: string) {
    await this.getTenantById(tenantId);

    return this.prismaService.client.organization.findMany({
      where: { tenantId },
      include: {
        linkedUser: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
  }

  async createOrganization(input: CreateOrganizationRecordInput) {
    await this.getTenantById(input.tenantId);

    return this.prismaService.client.organization.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        ...(input.legalName ? { legalName: input.legalName } : {}),
        ...(input.partnerType ? { partnerType: input.partnerType } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.linkedUserId !== undefined ? { linkedUserId: input.linkedUserId } : {}),
        ...(input.contactName ? { contactName: input.contactName } : {}),
        ...(input.contactEmail ? { contactEmail: input.contactEmail } : {}),
        ...(input.contactPhone ? { contactPhone: input.contactPhone } : {}),
        ...(input.address ? { address: input.address } : {}),
        ...(input.country ? { country: input.country } : {}),
        ...(input.notes ? { notes: input.notes } : {})
      }
    });
  }

  async updateOrganization(input: UpdateOrganizationRecordInput) {
    await this.getTenantById(input.tenantId);

    const organization = await this.prismaService.client.organization.findFirst({
      where: {
        id: input.organizationId,
        tenantId: input.tenantId
      }
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${input.organizationId} was not found in tenant ${input.tenantId}.`);
    }

    return this.prismaService.client.organization.update({
      where: { id: input.organizationId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.legalName !== undefined ? { legalName: input.legalName } : {}),
        ...(input.partnerType !== undefined ? { partnerType: input.partnerType } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.linkedUserId !== undefined ? { linkedUserId: input.linkedUserId } : {}),
        ...(input.contactName !== undefined ? { contactName: input.contactName } : {}),
        ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail } : {}),
        ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.country !== undefined ? { country: input.country } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {})
      }
    });
  }

  async listOrgUnits(tenantId: string) {
    await this.getTenantById(tenantId);

    return this.prismaService.client.orgUnit.findMany({
      where: { tenantId },
      include: {
        organization: true,
        parent: true,
        children: true
      },
      orderBy: [{ organizationId: 'asc' }, { name: 'asc' }]
    });
  }

  async createOrgUnit(input: CreateOrgUnitRecordInput) {
    await this.getTenantById(input.tenantId);

    const organization = await this.prismaService.client.organization.findFirst({
      where: {
        id: input.organizationId,
        tenantId: input.tenantId
      },
      select: {
        id: true
      }
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${input.organizationId} was not found in tenant ${input.tenantId}.`);
    }

    if (input.parentId) {
      const parent = await this.prismaService.client.orgUnit.findFirst({
        where: {
          id: input.parentId,
          tenantId: input.tenantId
        },
        select: {
          id: true
        }
      });

      if (!parent) {
        throw new NotFoundException(`Parent org unit ${input.parentId} was not found in tenant ${input.tenantId}.`);
      }
    }

    return this.prismaService.client.orgUnit.create({
      data: {
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        name: input.name,
        ...(input.parentId ? { parentId: input.parentId } : {}),
        ...(input.code ? { code: input.code } : {})
      },
      include: {
        organization: true,
        parent: true,
        children: true
      }
    });
  }

  async listMemberships(tenantId: string) {
    await this.getTenantById(tenantId);

    return this.prismaService.client.membership.findMany({
      where: { tenantId },
      include: {
        user: true,
        organization: true,
        orgUnit: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
  }

  async createMembership(input: CreateMembershipRecordInput) {
    await this.getTenantById(input.tenantId);

    const user = await this.prismaService.client.user.findUnique({
      where: { id: input.userId }
    });

    if (!user) {
      throw new NotFoundException(`User ${input.userId} was not found.`);
    }

    if (input.organizationId) {
      const organization = await this.prismaService.client.organization.findFirst({
        where: {
          id: input.organizationId,
          tenantId: input.tenantId
        },
        select: {
          id: true
        }
      });

      if (!organization) {
        throw new NotFoundException(`Organization ${input.organizationId} was not found in tenant ${input.tenantId}.`);
      }
    }

    if (input.orgUnitId) {
      const orgUnit = await this.prismaService.client.orgUnit.findFirst({
        where: {
          id: input.orgUnitId,
          tenantId: input.tenantId
        },
        select: {
          id: true
        }
      });

      if (!orgUnit) {
        throw new NotFoundException(`Org unit ${input.orgUnitId} was not found in tenant ${input.tenantId}.`);
      }
    }

    try {
      const data: Prisma.MembershipUncheckedCreateInput = {
        tenantId: input.tenantId,
        userId: input.userId,
        membershipType: input.membershipType,
        status: input.status
      };

      if (input.organizationId) {
        data.organizationId = input.organizationId;
      }

      if (input.orgUnitId) {
        data.orgUnitId = input.orgUnitId;
      }

      return await this.prismaService.client.membership.create({
        data,
        include: {
          user: true,
          organization: true,
          orgUnit: true
        }
      });
    } catch (error) {
      this.handlePrismaConflict(error, 'Membership could not be created.');
    }
  }

  private handlePrismaConflict(error: unknown, fallbackMessage: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('A unique constraint would be violated by this request.');
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new ConflictException(fallbackMessage);
  }
}
