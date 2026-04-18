import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../app/prisma.service.js';

export interface CreateSellerProfileInput {
  userId?: string | undefined;
  tenantId?: string | undefined;
  sellerType: 'individual' | 'business';
  displayName: string;
  companyName?: string | undefined;
  country?: string | undefined;
}

export interface UpdateSellerPayoutSettingsInput {
  payoutBeneficiaryName: string;
  payoutCompanyName: string;
  payoutBankName: string;
  payoutAccountNumber: string;
  payoutIban: string;
  payoutSwiftBic: string;
  payoutStatus?: string | undefined;
  payoutReviewNote?: string | undefined;
}

export interface CreateBuyerProfileInput {
  userId?: string | undefined;
  tenantId?: string | undefined;
  buyerType: 'consumer' | 'business';
  displayName: string;
}

export interface CreateCategoryInput {
  parentId?: string | undefined;
  slug: string;
  name: string;
  description?: string | undefined;
}

export interface CreateProductInput {
  sellerProfileId: string;
  categoryId: string;
  slug: string;
  sku: string;
  name: string;
  description?: string | undefined;
  status: 'draft' | 'published' | 'archived';
  targetMarket: 'b2c' | 'b2b' | 'both';
  currency: string;
  amountMinor: number;
}

@Injectable()
export class CatalogProductRepository {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async listCategories() {
    return this.prismaService.client.category.findMany({
      include: {
        parent: true,
        children: true
      },
      orderBy: {
        name: 'asc'
      }
    });
  }

  async createCategory(input: CreateCategoryInput) {
    if (input.parentId) {
      await this.getCategoryById(input.parentId);
    }

    try {
      return await this.prismaService.client.category.create({
        data: {
          slug: input.slug,
          name: input.name,
          ...(input.parentId ? { parentId: input.parentId } : {}),
          ...(input.description ? { description: input.description } : {})
        },
        include: {
          parent: true,
          children: true
        }
      });
    } catch (error) {
      this.handleConflict(error, 'Category could not be created.');
    }
  }

  async getCategoryById(id: string) {
    const category = await this.prismaService.client.category.findUnique({
      where: { id }
    });

    if (!category) {
      throw new NotFoundException(`Category ${id} was not found.`);
    }

    return category;
  }

  async listSellerProfiles() {
    return this.prismaService.client.sellerProfile.findMany({
      include: {
        user: true,
        tenant: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getSellerProfileByUserId(userId: string) {
    const sellerProfile = await this.prismaService.client.sellerProfile.findFirst({
      where: { userId },
      include: {
        user: true,
        tenant: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!sellerProfile) {
      throw new NotFoundException(`Seller profile for user ${userId} was not found.`);
    }

    return sellerProfile;
  }

  async updateSellerProfilePayoutSettings(userId: string, input: UpdateSellerPayoutSettingsInput) {
    const sellerProfile = await this.getSellerProfileByUserId(userId);

    return this.prismaService.client.sellerProfile.update({
      where: { id: sellerProfile.id },
      data: {
        payoutBeneficiaryName: input.payoutBeneficiaryName,
        payoutCompanyName: input.payoutCompanyName,
        payoutBankName: input.payoutBankName,
        payoutAccountNumber: input.payoutAccountNumber,
        payoutIban: input.payoutIban,
        payoutSwiftBic: input.payoutSwiftBic,
        payoutStatus: input.payoutStatus ?? 'pending_review',
        payoutReviewNote: input.payoutReviewNote ?? null,
        payoutVerifiedAt: null
      },
      include: {
        user: true,
        tenant: true
      }
    });
  }

  async createSellerProfile(input: CreateSellerProfileInput) {
    await this.ensureUserAndTenant(input.userId, input.tenantId);

    return this.prismaService.client.sellerProfile.create({
      data: {
        sellerType: input.sellerType,
        displayName: input.displayName,
        ...(input.companyName ? { companyName: input.companyName } : {}),
        ...(input.country ? { country: input.country } : {}),
        ...(input.userId ? { userId: input.userId } : {}),
        ...(input.tenantId ? { tenantId: input.tenantId } : {})
      },
      include: {
        user: true,
        tenant: true
      }
    });
  }

  async listBuyerProfiles() {
    return this.prismaService.client.buyerProfile.findMany({
      include: {
        user: true,
        tenant: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async createBuyerProfile(input: CreateBuyerProfileInput) {
    await this.ensureUserAndTenant(input.userId, input.tenantId);

    return this.prismaService.client.buyerProfile.create({
      data: {
        buyerType: input.buyerType,
        displayName: input.displayName,
        ...(input.userId ? { userId: input.userId } : {}),
        ...(input.tenantId ? { tenantId: input.tenantId } : {})
      },
      include: {
        user: true,
        tenant: true
      }
    });
  }

  async listProducts(includeDrafts = true) {
    return this.prismaService.client.product.findMany({
      ...(includeDrafts ? {} : { where: { status: 'published' as const } }),
      include: {
        category: true,
        sellerProfile: true,
        prices: {
          where: {
            isActive: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async createProduct(input: CreateProductInput) {
    await this.ensureSellerAndCategory(input.sellerProfileId, input.categoryId);

    try {
      return await this.prismaService.client.product.create({
        data: {
          sellerProfileId: input.sellerProfileId,
          categoryId: input.categoryId,
          slug: input.slug,
          sku: input.sku,
          name: input.name,
          status: input.status,
          targetMarket: input.targetMarket,
          ...(input.description ? { description: input.description } : {}),
          prices: {
            create: {
              currency: input.currency,
              amountMinor: input.amountMinor,
              isActive: true
            }
          }
        },
        include: {
          category: true,
          sellerProfile: true,
          prices: true
        }
      });
    } catch (error) {
      this.handleConflict(error, 'Product could not be created.');
    }
  }

  private async ensureUserAndTenant(userId?: string, tenantId?: string) {
    if (userId) {
      const user = await this.prismaService.client.user.findUnique({
        where: { id: userId },
        select: { id: true }
      });

      if (!user) {
        throw new NotFoundException(`User ${userId} was not found.`);
      }
    }

    if (tenantId) {
      const tenant = await this.prismaService.client.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true }
      });

      if (!tenant) {
        throw new NotFoundException(`Tenant ${tenantId} was not found.`);
      }
    }
  }

  private async ensureSellerAndCategory(sellerProfileId: string, categoryId: string) {
    const [sellerProfile, category] = await Promise.all([
      this.prismaService.client.sellerProfile.findUnique({
        where: { id: sellerProfileId },
        select: { id: true }
      }),
      this.prismaService.client.category.findUnique({
        where: { id: categoryId },
        select: { id: true }
      })
    ]);

    if (!sellerProfile) {
      throw new NotFoundException(`Seller profile ${sellerProfileId} was not found.`);
    }

    if (!category) {
      throw new NotFoundException(`Category ${categoryId} was not found.`);
    }
  }

  private handleConflict(error: unknown, fallbackMessage: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('A unique constraint would be violated by this request.');
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new ConflictException(fallbackMessage);
  }
}
