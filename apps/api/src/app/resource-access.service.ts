import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthContext } from './auth-context.js';
import { PrismaService } from './prisma.service.js';

@Injectable()
export class ResourceAccessService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  isPlatformAdmin(authContext: AuthContext) {
    return authContext.roles.includes('platform_admin');
  }

  getAccessibleTenantIds(authContext: AuthContext) {
    if (this.isPlatformAdmin(authContext)) {
      return null;
    }

    return [...new Set(authContext.tenantIds.filter((tenantId): tenantId is string => Boolean(tenantId)))];
  }

  filterByTenant<T>(authContext: AuthContext, records: T[], getTenantId: (record: T) => string | null | undefined) {
    const accessibleTenantIds = this.getAccessibleTenantIds(authContext);

    if (accessibleTenantIds === null) {
      return records;
    }

    const allowed = new Set(accessibleTenantIds);
    return records.filter((record) => {
      const tenantId = getTenantId(record);
      return typeof tenantId === 'string' && allowed.has(tenantId);
    });
  }

  ensureTenantAccess(authContext: AuthContext, tenantId: string) {
    if (this.isPlatformAdmin(authContext)) {
      return;
    }

    const accessibleTenantIds = new Set(this.getAccessibleTenantIds(authContext) ?? []);

    if (!accessibleTenantIds.has(tenantId)) {
      throw new ForbiddenException(`Access to tenant ${tenantId} is not allowed.`);
    }
  }

  async ensureOrganizationAccess(authContext: AuthContext, organizationId: string) {
    const organization = await this.prismaService.client.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, tenantId: true }
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${organizationId} was not found.`);
    }

    this.ensureTenantAccess(authContext, organization.tenantId);
    return organization;
  }

  async ensureDealAccess(authContext: AuthContext, dealId: string) {
    const deal = await this.prismaService.client.wholesaleDeal.findUnique({
      where: { id: dealId },
      select: { id: true, tenantId: true }
    });

    if (!deal) {
      throw new NotFoundException(`Deal ${dealId} was not found.`);
    }

    this.ensureTenantAccess(authContext, deal.tenantId);
    return deal;
  }

  async ensureRfqAccess(authContext: AuthContext, rfqId: string) {
    const rfq = await this.prismaService.client.wholesaleRfq.findUnique({
      where: { id: rfqId },
      select: { id: true, tenantId: true }
    });

    if (!rfq) {
      throw new NotFoundException(`RFQ ${rfqId} was not found.`);
    }

    this.ensureTenantAccess(authContext, rfq.tenantId);
    return rfq;
  }

  async ensureContractAccess(authContext: AuthContext, contractId: string) {
    const contract = await this.prismaService.client.contract.findUnique({
      where: { id: contractId },
      select: {
        id: true,
        deal: {
          select: {
            tenantId: true
          }
        }
      }
    });

    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} was not found.`);
    }

    this.ensureTenantAccess(authContext, contract.deal.tenantId);
    return contract;
  }

  async ensurePaymentAccess(authContext: AuthContext, paymentTransactionId: string) {
    const paymentTransaction = await this.prismaService.client.paymentTransaction.findUnique({
      where: { id: paymentTransactionId },
      select: {
        id: true,
        deal: {
          select: {
            tenantId: true
          }
        }
      }
    });

    if (!paymentTransaction) {
      throw new NotFoundException(`Payment transaction ${paymentTransactionId} was not found.`);
    }

    if (!paymentTransaction.deal) {
      throw new ForbiddenException(`Payment transaction ${paymentTransactionId} is not tenant scoped.`);
    }

    this.ensureTenantAccess(authContext, paymentTransaction.deal.tenantId);
    return paymentTransaction;
  }

  async ensureDocumentAccess(authContext: AuthContext, documentId: string) {
    const document = await this.prismaService.client.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        tenantId: true,
        links: {
          select: {
            deal: {
              select: {
                tenantId: true
              }
            },
            contract: {
              select: {
                deal: {
                  select: {
                    tenantId: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} was not found.`);
    }

    const tenantId =
      document.tenantId ??
      document.links.find((link) => link.deal?.tenantId)?.deal?.tenantId ??
      document.links.find((link) => link.contract?.deal.tenantId)?.contract?.deal.tenantId;

    if (!tenantId) {
      throw new ForbiddenException(`Document ${documentId} is not tenant scoped.`);
    }

    this.ensureTenantAccess(authContext, tenantId);
    return document;
  }
}
