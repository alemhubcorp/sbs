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
  imageUrls?: string[] | undefined;
  availabilityStatus?: 'in_stock' | 'low_stock' | 'preorder' | 'out_of_stock' | 'discontinued' | undefined;
  inventoryQuantity?: number | undefined;
  leadTimeDays?: number | undefined;
  minimumOrderQuantity?: number | undefined;
  compareAtAmountMinor?: number | undefined;
  salePriceMinor?: number | undefined;
  saleStartsAt?: Date | undefined;
  saleEndsAt?: Date | undefined;
  isPreorderEnabled?: boolean | undefined;
  preorderReleaseAt?: Date | undefined;
  preorderDepositAmountMinor?: number | undefined;
}

export interface UpsertSupplierProductInput {
  sellerProfileId: string;
  categoryId: string;
  slug: string;
  sku: string;
  name: string;
  description: string;
  seoTitle?: string | undefined;
  metaDescription?: string | undefined;
  localizedContent?: Prisma.InputJsonValue | undefined;
  status: 'draft' | 'published' | 'archived';
  targetMarket: 'b2c' | 'b2b' | 'both';
  currency: string;
  amountMinor: number;
  imageUrls: string[];
  availabilityStatus: 'in_stock' | 'low_stock' | 'preorder' | 'out_of_stock' | 'discontinued';
  inventoryQuantity: number;
  leadTimeDays?: number | undefined;
  minimumOrderQuantity: number;
  compareAtAmountMinor?: number | undefined;
  salePriceMinor?: number | undefined;
  saleStartsAt?: Date | undefined;
  saleEndsAt?: Date | undefined;
  auctionEnabled: boolean;
  auctionStatus: 'scheduled' | 'active' | null;
  auctionStartsAt?: Date | undefined;
  auctionEndsAt?: Date | undefined;
  auctionStartingBidMinor?: number | undefined;
  auctionReserveBidMinor?: number | undefined;
  isPreorderEnabled: boolean;
  preorderReleaseAt?: Date | undefined;
  preorderDepositAmountMinor?: number | undefined;
}

export interface SupplierProductListFilters {
  status?: 'draft' | 'published' | 'archived' | 'all' | undefined;
  q?: string | undefined;
}

export interface CatalogProductFilters {
  q?: string | undefined;
  market?: 'retail' | 'wholesale' | 'b2c' | 'b2b' | 'all' | undefined;
  category?: string | undefined;
  seller?: string | undefined;
  availability?: 'in_stock' | 'low_stock' | 'preorder' | 'out_of_stock' | 'all' | undefined;
  sort?: 'newest' | 'price_asc' | 'price_desc' | undefined;
}

const catalogProductInclude = {
  category: true,
  sellerProfile: {
    include: {
      user: true
    }
  },
  prices: {
    where: {
      isActive: true
    },
    orderBy: {
      createdAt: 'desc' as const
    }
  },
  auction: {
    include: {
      winnerBuyerProfile: true,
      bids: {
        orderBy: [
          { amountMinor: 'desc' as const },
          { createdAt: 'asc' as const }
        ],
        include: {
          buyerProfile: true
        }
      }
    }
  },
  preorderReservations: {
    orderBy: {
      createdAt: 'desc' as const
    },
    include: {
      buyerProfile: true
    }
  }
} satisfies Prisma.ProductInclude;

type CatalogProductRow = Prisma.ProductGetPayload<{
  include: typeof catalogProductInclude;
}>;

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

  async getBuyerProfileByUserId(userId: string) {
    const buyerProfile = await this.prismaService.client.buyerProfile.findFirst({
      where: { userId },
      include: {
        user: true,
        tenant: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!buyerProfile) {
      throw new NotFoundException(`Buyer profile for user ${userId} was not found.`);
    }

    return buyerProfile;
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

  async listProducts(includeDrafts = true, filters: CatalogProductFilters = {}) {
    const rows = await this.prismaService.client.product.findMany({
      where: this.buildProductWhere(includeDrafts, filters),
      include: catalogProductInclude,
      orderBy: {
        createdAt: 'desc'
      }
    });

    return this.sortProducts(rows, filters.sort);
  }

  async listSupplierProducts(sellerProfileId: string, filters: SupplierProductListFilters = {}) {
    return this.prismaService.client.product.findMany({
      where: {
        sellerProfileId,
        ...(filters.status && filters.status !== 'all' ? { status: filters.status } : {}),
        ...(filters.q
          ? {
              OR: [
                { name: { contains: filters.q, mode: 'insensitive' } },
                { description: { contains: filters.q, mode: 'insensitive' } },
                { slug: { contains: filters.q, mode: 'insensitive' } },
                { sku: { contains: filters.q, mode: 'insensitive' } }
              ]
            }
          : {})
      },
      include: catalogProductInclude,
      orderBy: {
        updatedAt: 'desc'
      }
    });
  }

  async getSupplierProductById(id: string, sellerProfileId: string) {
    const product = await this.prismaService.client.product.findFirst({
      where: {
        id,
        sellerProfileId
      },
      include: catalogProductInclude
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} was not found.`);
    }

    return product;
  }

  async getProductBySlug(slug: string, includeDrafts = false) {
    const product = await this.prismaService.client.product.findFirst({
      where: this.buildProductWhere(includeDrafts, {}, slug),
      include: catalogProductInclude
    });

    if (!product) {
      throw new NotFoundException(`Product ${slug} was not found.`);
    }

    return product;
  }

  async listAuctions(filters: CatalogProductFilters = {}) {
    return this.prismaService.client.productAuction.findMany({
      where: {
        status: {
          in: ['active', 'scheduled']
        },
        product: this.buildProductWhere(false, {
          ...filters,
          market: filters.market && filters.market !== 'all' ? filters.market : 'wholesale'
        })
      },
      include: {
        product: {
          include: catalogProductInclude
        },
        winnerBuyerProfile: true,
        bids: {
          orderBy: [
            { amountMinor: 'desc' },
            { createdAt: 'asc' }
          ],
          include: {
            buyerProfile: true
          }
        }
      },
      orderBy: {
        endsAt: 'asc'
      }
    });
  }

  async listPreorders(filters: CatalogProductFilters = {}) {
    const products = await this.prismaService.client.product.findMany({
      where: this.buildProductWhere(false, {
        ...filters,
        availability: filters.availability && filters.availability !== 'all' ? filters.availability : 'preorder'
      }),
      include: catalogProductInclude,
      orderBy: {
        preorderReleaseAt: 'asc'
      }
    });

    return products.filter((product) => product.isPreorderEnabled || product.availabilityStatus === 'preorder');
  }

  async placeAuctionBid(auctionId: string, buyerProfileId: string, amountMinor: number) {
    const auction = await this.prismaService.client.productAuction.findUnique({
      where: { id: auctionId },
      include: {
        product: {
          include: {
            prices: {
              where: {
                isActive: true
              },
              orderBy: {
                createdAt: 'desc'
              },
              take: 1
            }
          }
        },
        bids: {
          orderBy: [
            { amountMinor: 'desc' },
            { createdAt: 'asc' }
          ],
          take: 1
        }
      }
    });

    if (!auction) {
      throw new NotFoundException(`Auction ${auctionId} was not found.`);
    }

    if (auction.status !== 'active') {
      throw new ConflictException('Auction is not accepting bids.');
    }

    if (auction.endsAt.getTime() <= Date.now()) {
      throw new ConflictException('Auction has already ended.');
    }

    const minBid = Math.max(auction.currentBidMinor ?? 0, auction.startingBidMinor) + 100;
    if (amountMinor < minBid) {
      throw new ConflictException(`Bid must be at least ${minBid}.`);
    }

    return this.prismaService.client.$transaction(async (tx) => {
      const bid = await tx.productAuctionBid.create({
        data: {
          auctionId,
          buyerProfileId,
          amountMinor
        },
        include: {
          buyerProfile: true
        }
      });

      await tx.productAuction.update({
        where: { id: auctionId },
        data: {
          currentBidMinor: amountMinor,
          winnerBuyerProfileId: buyerProfileId
        }
      });

      return bid;
    });
  }

  async createPreorderReservation(productId: string, buyerProfileId: string, quantity: number, note?: string | null) {
    const product = await this.prismaService.client.product.findUnique({
      where: { id: productId },
      include: {
        prices: {
          where: {
            isActive: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    });

    if (!product) {
      throw new NotFoundException(`Product ${productId} was not found.`);
    }

    if (!product.isPreorderEnabled && product.availabilityStatus !== 'preorder') {
      throw new ConflictException('Product is not open for preorder.');
    }

    const activePrice = product.prices[0];
    if (!activePrice) {
      throw new ConflictException('Product does not have an active price.');
    }

    const minimumOrderQuantity = Math.max(1, product.minimumOrderQuantity ?? 1);
    if (quantity < minimumOrderQuantity) {
      throw new ConflictException(`Preorder quantity must be at least ${minimumOrderQuantity}.`);
    }

    const unitAmountMinor = this.resolveCurrentAmount(product, activePrice.amountMinor);

    return this.prismaService.client.productPreorderReservation.create({
      data: {
        productId,
        buyerProfileId,
        quantity,
        unitAmountMinor,
        totalAmountMinor: unitAmountMinor * quantity,
        ...(note ? { note } : {})
      },
      include: {
        buyerProfile: true,
        product: {
          include: catalogProductInclude
        }
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
          ...(input.imageUrls?.length ? { imageUrls: input.imageUrls } : {}),
          ...(input.availabilityStatus ? { availabilityStatus: input.availabilityStatus } : {}),
          ...(input.inventoryQuantity !== undefined ? { inventoryQuantity: input.inventoryQuantity } : {}),
          ...(input.leadTimeDays !== undefined ? { leadTimeDays: input.leadTimeDays } : {}),
          ...(input.minimumOrderQuantity !== undefined ? { minimumOrderQuantity: input.minimumOrderQuantity } : {}),
          ...(input.compareAtAmountMinor !== undefined ? { compareAtAmountMinor: input.compareAtAmountMinor } : {}),
          ...(input.salePriceMinor !== undefined ? { salePriceMinor: input.salePriceMinor } : {}),
          ...(input.saleStartsAt ? { saleStartsAt: input.saleStartsAt } : {}),
          ...(input.saleEndsAt ? { saleEndsAt: input.saleEndsAt } : {}),
          ...(input.isPreorderEnabled !== undefined ? { isPreorderEnabled: input.isPreorderEnabled } : {}),
          ...(input.preorderReleaseAt ? { preorderReleaseAt: input.preorderReleaseAt } : {}),
          ...(input.preorderDepositAmountMinor !== undefined
            ? { preorderDepositAmountMinor: input.preorderDepositAmountMinor }
            : {}),
          prices: {
            create: {
              currency: input.currency,
              amountMinor: input.amountMinor,
              isActive: true
            }
          }
        },
        include: catalogProductInclude
      });
    } catch (error) {
      this.handleConflict(error, 'Product could not be created.');
    }
  }

  async generateUniqueProductIdentity(name: string, preferredSlug?: string, preferredSku?: string, productId?: string) {
    const slugBase = this.normalizeSlug(preferredSlug ?? name);
    const skuBase = this.normalizeSku(preferredSku ?? name);
    const slug = await this.makeUniqueValue(
      async (candidate) =>
        this.prismaService.client.product.findFirst({
          where: {
            slug: candidate,
            ...(productId ? { NOT: { id: productId } } : {})
          },
          select: { id: true }
        }),
      slugBase,
      (value, attempt) => `${value.slice(0, 68)}-${attempt}`
    );
    const sku = await this.makeUniqueValue(
      async (candidate) =>
        this.prismaService.client.product.findFirst({
          where: {
            sku: candidate,
            ...(productId ? { NOT: { id: productId } } : {})
          },
          select: { id: true }
        }),
      skuBase,
      (value, attempt) => `${value.slice(0, 60)}-${attempt}`
    );

    return { slug, sku };
  }

  async createSupplierProduct(input: UpsertSupplierProductInput) {
    await this.ensureSellerAndCategory(input.sellerProfileId, input.categoryId);

    try {
      return await this.prismaService.client.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            sellerProfileId: input.sellerProfileId,
            categoryId: input.categoryId,
            slug: input.slug,
            sku: input.sku,
            name: input.name,
            description: input.description,
            seoTitle: input.seoTitle ?? null,
            metaDescription: input.metaDescription ?? null,
            localizedContent: input.localizedContent ?? Prisma.JsonNull,
            status: input.status,
            targetMarket: input.targetMarket,
            imageUrls: input.imageUrls,
            availabilityStatus: input.availabilityStatus,
            inventoryQuantity: input.inventoryQuantity,
            ...(input.leadTimeDays !== undefined ? { leadTimeDays: input.leadTimeDays } : {}),
            minimumOrderQuantity: input.minimumOrderQuantity,
            ...(input.compareAtAmountMinor !== undefined ? { compareAtAmountMinor: input.compareAtAmountMinor } : {}),
            ...(input.salePriceMinor !== undefined ? { salePriceMinor: input.salePriceMinor } : {}),
            ...(input.saleStartsAt ? { saleStartsAt: input.saleStartsAt } : {}),
            ...(input.saleEndsAt ? { saleEndsAt: input.saleEndsAt } : {}),
            isPreorderEnabled: input.isPreorderEnabled,
            ...(input.preorderReleaseAt ? { preorderReleaseAt: input.preorderReleaseAt } : {}),
            ...(input.preorderDepositAmountMinor !== undefined ? { preorderDepositAmountMinor: input.preorderDepositAmountMinor } : {})
          }
        });

        await tx.productPrice.create({
          data: {
            productId: product.id,
            currency: input.currency,
            amountMinor: input.amountMinor,
            isActive: true
          }
        });

        if (input.auctionEnabled && input.auctionStatus && input.auctionStartsAt && input.auctionEndsAt && input.auctionStartingBidMinor) {
          await tx.productAuction.create({
            data: {
              productId: product.id,
              status: input.auctionStatus,
              currency: input.currency,
              startingBidMinor: input.auctionStartingBidMinor,
              ...(input.auctionReserveBidMinor !== undefined ? { reserveBidMinor: input.auctionReserveBidMinor } : {}),
              startsAt: input.auctionStartsAt,
              endsAt: input.auctionEndsAt
            }
          });
        }

        return tx.product.findUniqueOrThrow({
          where: { id: product.id },
          include: catalogProductInclude
        });
      });
    } catch (error) {
      this.handleConflict(error, 'Product could not be created.');
    }
  }

  async updateSupplierProduct(id: string, sellerProfileId: string, input: UpsertSupplierProductInput) {
    await this.getSupplierProductById(id, sellerProfileId);
    await this.ensureSellerAndCategory(sellerProfileId, input.categoryId);

    try {
      return await this.prismaService.client.$transaction(async (tx) => {
        const existing = await tx.product.findUniqueOrThrow({
          where: { id },
          include: {
            prices: {
              where: { isActive: true },
              orderBy: { createdAt: 'desc' },
              take: 1
            },
            auction: {
              include: {
                bids: {
                  take: 1
                }
              }
            }
          }
        });

        await tx.product.update({
          where: { id },
          data: {
            categoryId: input.categoryId,
            slug: input.slug,
            sku: input.sku,
            name: input.name,
            description: input.description,
            seoTitle: input.seoTitle ?? null,
            metaDescription: input.metaDescription ?? null,
            localizedContent: input.localizedContent ?? Prisma.JsonNull,
            status: input.status,
            targetMarket: input.targetMarket,
            imageUrls: input.imageUrls,
            availabilityStatus: input.availabilityStatus,
            inventoryQuantity: input.inventoryQuantity,
            leadTimeDays: input.leadTimeDays ?? null,
            minimumOrderQuantity: input.minimumOrderQuantity,
            compareAtAmountMinor: input.compareAtAmountMinor ?? null,
            salePriceMinor: input.salePriceMinor ?? null,
            saleStartsAt: input.saleStartsAt ?? null,
            saleEndsAt: input.saleEndsAt ?? null,
            isPreorderEnabled: input.isPreorderEnabled,
            preorderReleaseAt: input.preorderReleaseAt ?? null,
            preorderDepositAmountMinor: input.preorderDepositAmountMinor ?? null
          }
        });

        const activePrice = existing.prices[0];
        if (!activePrice || activePrice.currency !== input.currency || activePrice.amountMinor !== input.amountMinor) {
          await tx.productPrice.updateMany({
            where: {
              productId: id,
              isActive: true
            },
            data: {
              isActive: false
            }
          });

          await tx.productPrice.create({
            data: {
              productId: id,
              currency: input.currency,
              amountMinor: input.amountMinor,
              isActive: true
            }
          });
        }

        if (input.auctionEnabled && input.auctionStatus && input.auctionStartsAt && input.auctionEndsAt && input.auctionStartingBidMinor) {
          if (existing.auction?.bids.length) {
            throw new ConflictException('Auction settings cannot be reconfigured after bids have been placed.');
          }

          if (existing.auction) {
            await tx.productAuction.update({
              where: { id: existing.auction.id },
              data: {
                status: input.auctionStatus,
                currency: input.currency,
                startingBidMinor: input.auctionStartingBidMinor,
                reserveBidMinor: input.auctionReserveBidMinor ?? null,
                startsAt: input.auctionStartsAt,
                endsAt: input.auctionEndsAt,
                winnerBuyerProfileId: null,
                currentBidMinor: null
              }
            });
          } else {
            await tx.productAuction.create({
              data: {
                productId: id,
                status: input.auctionStatus,
                currency: input.currency,
                startingBidMinor: input.auctionStartingBidMinor,
                ...(input.auctionReserveBidMinor !== undefined ? { reserveBidMinor: input.auctionReserveBidMinor } : {}),
                startsAt: input.auctionStartsAt,
                endsAt: input.auctionEndsAt
              }
            });
          }
        } else if (existing.auction) {
          if (existing.auction.bids.length) {
            throw new ConflictException('Auction cannot be removed after bids have been placed.');
          }

          await tx.productAuction.delete({
            where: { id: existing.auction.id }
          });
        }

        return tx.product.findUniqueOrThrow({
          where: { id },
          include: catalogProductInclude
        });
      });
    } catch (error) {
      this.handleConflict(error, 'Product could not be updated.');
    }
  }

  async publishSupplierProduct(id: string, sellerProfileId: string) {
    await this.getSupplierProductById(id, sellerProfileId);
    return this.prismaService.client.$transaction(async (tx) => {
      const product = await tx.product.findUniqueOrThrow({
        where: { id },
        include: {
          prices: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          auction: true
        }
      });

      if (!product.name || !product.description || !product.categoryId || !product.prices[0]) {
        throw new ConflictException('Product is missing required publish fields.');
      }

      if (!product.imageUrls || !Array.isArray(product.imageUrls) || product.imageUrls.length === 0) {
        throw new ConflictException('At least one product image is required before publishing.');
      }

      if (product.targetMarket === 'b2c' && product.auction) {
        throw new ConflictException('Retail-only products cannot be published with auction mode.');
      }

      await tx.product.update({
        where: { id },
        data: {
          status: 'published'
        }
      });

      return tx.product.findUniqueOrThrow({
        where: { id },
        include: catalogProductInclude
      });
    });
  }

  async unpublishSupplierProduct(id: string, sellerProfileId: string) {
    await this.getSupplierProductById(id, sellerProfileId);
    return this.prismaService.client.product.update({
      where: { id },
      data: {
        status: 'draft'
      },
      include: catalogProductInclude
    });
  }

  private buildProductWhere(includeDrafts: boolean, filters: CatalogProductFilters, slug?: string): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {
      ...(includeDrafts ? {} : { status: 'published' }),
      ...(slug ? { slug } : {}),
      ...(filters.category
        ? {
            OR: [
              { category: { slug: filters.category } },
              { category: { name: { equals: filters.category, mode: 'insensitive' } } }
            ]
          }
        : {}),
      ...(filters.seller
        ? {
            sellerProfile: {
              displayName: {
                contains: filters.seller,
                mode: 'insensitive'
              }
            }
          }
        : {}),
      ...(filters.q
        ? {
            AND: [
              {
                OR: [
                  { name: { contains: filters.q, mode: 'insensitive' } },
                  { description: { contains: filters.q, mode: 'insensitive' } },
                  { slug: { contains: filters.q, mode: 'insensitive' } },
                  { sku: { contains: filters.q, mode: 'insensitive' } },
                  {
                    sellerProfile: {
                      displayName: {
                        contains: filters.q,
                        mode: 'insensitive'
                      }
                    }
                  },
                  {
                    category: {
                      name: {
                        contains: filters.q,
                        mode: 'insensitive'
                      }
                    }
                  }
                ]
              }
            ]
          }
        : {})
    };

    if (filters.market === 'retail' || filters.market === 'b2c') {
      where.targetMarket = {
        in: ['b2c', 'both']
      };
    } else if (filters.market === 'wholesale' || filters.market === 'b2b') {
      where.targetMarket = {
        in: ['b2b', 'both']
      };
    }

    if (filters.availability && filters.availability !== 'all') {
      where.availabilityStatus = filters.availability;
    }

    return where;
  }

  private sortProducts(rows: CatalogProductRow[], sort: CatalogProductFilters['sort']) {
    const copy = [...rows];

    if (sort === 'price_asc') {
      copy.sort((left, right) => this.resolveCurrentAmount(left) - this.resolveCurrentAmount(right));
      return copy;
    }

    if (sort === 'price_desc') {
      copy.sort((left, right) => this.resolveCurrentAmount(right) - this.resolveCurrentAmount(left));
      return copy;
    }

    return copy;
  }

  private resolveCurrentAmount(
    product: Pick<CatalogProductRow, 'salePriceMinor' | 'saleStartsAt' | 'saleEndsAt' | 'prices'>,
    fallbackAmount?: number
  ) {
    const activePrice = fallbackAmount ?? product.prices?.[0]?.amountMinor ?? 0;
    if (!product.salePriceMinor) {
      return activePrice;
    }

    const now = Date.now();
    const saleStartsAt = product.saleStartsAt?.getTime() ?? null;
    const saleEndsAt = product.saleEndsAt?.getTime() ?? null;
    const saleStarted = saleStartsAt === null || saleStartsAt <= now;
    const saleActive = saleEndsAt === null || saleEndsAt >= now;

    return saleStarted && saleActive ? Math.min(product.salePriceMinor, activePrice) : activePrice;
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

  private normalizeSlug(value: string) {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);

    return normalized || `product-${Date.now()}`;
  }

  private normalizeSku(value: string) {
    const normalized = value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);

    return normalized || `SKU-${Date.now()}`;
  }

  private async makeUniqueValue(
    lookup: (candidate: string) => Promise<{ id: string } | null>,
    base: string,
    variant: (value: string, attempt: number) => string
  ) {
    let attempt = 0;
    let candidate = base;

    while (await lookup(candidate)) {
      attempt += 1;
      candidate = variant(base, attempt);
    }

    return candidate;
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
