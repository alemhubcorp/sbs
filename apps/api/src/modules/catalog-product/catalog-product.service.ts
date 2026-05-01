import { ForbiddenException, Inject, Injectable, Optional } from '@nestjs/common';
import { z } from 'zod';
import type { AuthContext, RequestAuditContext } from '../../app/auth-context.js';
import { AuditService } from '../audit-observability/audit.service.js';
import { AiPlatformService } from '../ai-platform/ai-platform.service.js';
import { ComplianceCoreService } from '../compliance-core/compliance-core.service.js';
import { CatalogProductRepository, type UpsertSupplierProductInput } from './catalog-product.repository.js';

const createCategorySchema = z.object({
  parentId: z.string().min(1).optional(),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(500).optional()
});

const createSellerProfileSchema = z.object({
  userId: z.string().min(1).optional(),
  tenantId: z.string().min(1).optional(),
  sellerType: z.enum(['individual', 'business']),
  displayName: z.string().min(1).max(120),
  companyName: z.string().min(1).max(160).optional(),
  country: z.string().min(2).max(80).optional()
});

const createBuyerProfileSchema = z.object({
  userId: z.string().min(1).optional(),
  tenantId: z.string().min(1).optional(),
  buyerType: z.enum(['consumer', 'business']),
  displayName: z.string().min(1).max(120)
});

const updateSellerPayoutSettingsSchema = z.object({
  payoutBeneficiaryName: z.string().min(1).max(160),
  payoutCompanyName: z.string().min(1).max(160),
  payoutBankName: z.string().min(1).max(160),
  payoutAccountNumber: z.string().min(1).max(80),
  payoutIban: z.string().min(1).max(80),
  payoutSwiftBic: z.string().min(1).max(32)
});

const createProductSchema = z.object({
  sellerProfileId: z.string().min(1),
  categoryId: z.string().min(1),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  sku: z.string().min(2).max(80),
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(1000).optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  targetMarket: z.enum(['b2c', 'b2b', 'both']).default('both'),
  currency: z.string().length(3).default('USD'),
  amountMinor: z.coerce.number().int().min(0),
  imageUrls: z.array(z.string().url()).max(8).optional(),
  availabilityStatus: z.enum(['in_stock', 'low_stock', 'preorder', 'out_of_stock', 'discontinued']).default('in_stock'),
  inventoryQuantity: z.coerce.number().int().min(0).default(0),
  leadTimeDays: z.coerce.number().int().min(0).max(365).optional(),
  minimumOrderQuantity: z.coerce.number().int().min(1).max(100000).default(1),
  compareAtAmountMinor: z.coerce.number().int().min(0).optional(),
  salePriceMinor: z.coerce.number().int().min(0).optional(),
  saleStartsAt: z.coerce.date().optional(),
  saleEndsAt: z.coerce.date().optional(),
  isPreorderEnabled: z.boolean().optional(),
  preorderReleaseAt: z.coerce.date().optional(),
  preorderDepositAmountMinor: z.coerce.number().int().min(0).optional()
});

const listProductsQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  market: z.enum(['retail', 'wholesale', 'b2c', 'b2b', 'all']).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  seller: z.string().trim().min(1).max(120).optional(),
  availability: z.enum(['in_stock', 'low_stock', 'preorder', 'out_of_stock', 'all']).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc']).optional()
});

const auctionBidSchema = z.object({
  amountMinor: z.coerce.number().int().min(1)
});

const preorderReservationSchema = z.object({
  quantity: z.coerce.number().int().min(1),
  note: z.string().trim().max(300).optional()
});

const localizedContentEntrySchema = z.object({
  description: z.string().trim().min(1).max(4000).optional(),
  seoTitle: z.string().trim().min(1).max(180).optional(),
  metaDescription: z.string().trim().min(1).max(320).optional()
});

const supplierProductPayloadSchema = z.object({
  id: z.string().min(1).optional(),
  categoryId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(1000),
  seoTitle: z.string().trim().max(180).optional(),
  metaDescription: z.string().trim().max(320).optional(),
  localizedContent: z.record(z.string().trim().min(2).max(16), localizedContentEntrySchema).default({}),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/).optional(),
  sku: z.string().trim().min(2).max(80).optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  targetMarket: z.enum(['b2c', 'b2b', 'both']),
  currency: z.string().trim().length(3).default('USD'),
  amountMinor: z.coerce.number().int().min(1),
  imageUrls: z.array(z.string().url()).max(8).default([]),
  availabilityStatus: z.enum(['in_stock', 'low_stock', 'preorder', 'out_of_stock', 'discontinued']).default('in_stock'),
  inventoryQuantity: z.coerce.number().int().min(0).default(0),
  leadTimeDays: z.coerce.number().int().min(0).max(365).optional(),
  minimumOrderQuantity: z.coerce.number().int().min(1).max(100000).default(1),
  compareAtAmountMinor: z.coerce.number().int().min(0).optional(),
  salePriceMinor: z.coerce.number().int().min(0).optional(),
  saleStartsAt: z.coerce.date().optional(),
  saleEndsAt: z.coerce.date().optional(),
  auctionEnabled: z.boolean().default(false),
  auctionStartsAt: z.coerce.date().optional(),
  auctionEndsAt: z.coerce.date().optional(),
  auctionStartingBidMinor: z.coerce.number().int().min(1).optional(),
  auctionReserveBidMinor: z.coerce.number().int().min(0).optional(),
  isPreorderEnabled: z.boolean().default(false),
  preorderReleaseAt: z.coerce.date().optional(),
  preorderDepositAmountMinor: z.coerce.number().int().min(0).optional()
});

const supplierProductListQuerySchema = z.object({
  status: z.enum(['draft', 'published', 'archived', 'all']).optional(),
  q: z.string().trim().min(1).max(120).optional()
});

const supplierProductAiAssistSchema = z.object({
  action: z.enum(['generate_description', 'improve_description', 'generate_seo_title', 'generate_meta_description', 'translate_description']),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(4000).optional(),
  seoTitle: z.string().trim().max(180).optional(),
  metaDescription: z.string().trim().max(320).optional(),
  categoryId: z.string().trim().min(1).optional(),
  targetMarket: z.enum(['b2c', 'b2b', 'both']),
  currency: z.string().trim().length(3).optional(),
  amountMinor: z.coerce.number().int().min(1).optional(),
  language: z.string().trim().min(2).max(16).optional()
});

type SupplierProductPayload = z.infer<typeof supplierProductPayloadSchema>;

@Injectable()
export class CatalogProductService {
  constructor(
    @Inject(CatalogProductRepository) private readonly catalogProductRepository: CatalogProductRepository,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(AiPlatformService) private readonly aiPlatformService: AiPlatformService,
    @Optional() @Inject(ComplianceCoreService) private readonly complianceCoreService?: ComplianceCoreService
  ) {}

  listCategories() {
    return this.catalogProductRepository.listCategories();
  }

  async createCategory(input: unknown, auditContext: RequestAuditContext) {
    const category = await this.catalogProductRepository.createCategory(createCategorySchema.parse(input));

    await this.auditService.record({
      module: 'catalog-product',
      eventType: 'catalog.category.created',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'category',
      subjectId: category.id,
      payload: {
        slug: category.slug,
        parentId: category.parentId
      }
    });

    return category;
  }

  listSellerProfiles() {
    return this.catalogProductRepository.listSellerProfiles();
  }

  getCurrentSellerProfile(authContext: AuthContext) {
    this.ensureAuthenticatedSupplier(authContext);
    return this.catalogProductRepository.getSellerProfileByUserId(authContext.internalUserId!);
  }

  async updateCurrentSellerPayoutSettings(input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    this.ensureAuthenticatedSupplier(authContext);
    const sellerProfile = await this.catalogProductRepository.updateSellerProfilePayoutSettings(
      authContext.internalUserId!,
      updateSellerPayoutSettingsSchema.parse(input)
    );

    await this.auditService.record({
      module: 'catalog-product',
      eventType: 'catalog.seller-profile.payout-settings.updated',
      actorId: auditContext.actorId,
      tenantId: sellerProfile.tenantId ?? auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'seller-profile',
      subjectId: sellerProfile.id,
      payload: {
        payoutStatus: sellerProfile.payoutStatus,
        payoutBankName: sellerProfile.payoutBankName,
        payoutIban: sellerProfile.payoutIban
      }
    });

    return sellerProfile;
  }

  async createSellerProfile(input: unknown, auditContext: RequestAuditContext) {
    const sellerProfile = await this.catalogProductRepository.createSellerProfile(
      createSellerProfileSchema.parse(input)
    );

    await this.auditService.record({
      module: 'catalog-product',
      eventType: 'catalog.seller-profile.created',
      actorId: auditContext.actorId,
      tenantId: sellerProfile.tenantId ?? auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'seller-profile',
      subjectId: sellerProfile.id,
      payload: {
        sellerType: sellerProfile.sellerType,
        userId: sellerProfile.userId
      }
    });

    return sellerProfile;
  }

  listBuyerProfiles() {
    return this.catalogProductRepository.listBuyerProfiles();
  }

  async createBuyerProfile(input: unknown, auditContext: RequestAuditContext) {
    const buyerProfile = await this.catalogProductRepository.createBuyerProfile(createBuyerProfileSchema.parse(input));

    await this.auditService.record({
      module: 'catalog-product',
      eventType: 'catalog.buyer-profile.created',
      actorId: auditContext.actorId,
      tenantId: buyerProfile.tenantId ?? auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'buyer-profile',
      subjectId: buyerProfile.id,
      payload: {
        buyerType: buyerProfile.buyerType,
        userId: buyerProfile.userId
      }
    });

    return buyerProfile;
  }

  private ensureAuthenticatedBuyer(authContext: AuthContext) {
    if (!authContext?.isAuthenticated || !authContext.internalUserId) {
      throw new ForbiddenException('Authenticated buyer required.');
    }

    if (!authContext.roles.includes('customer_user') && !authContext.roles.includes('platform_admin')) {
      throw new ForbiddenException('Buyer access required.');
    }
  }

  private ensureAuthenticatedSupplier(authContext: AuthContext) {
    if (!authContext?.isAuthenticated || !authContext.internalUserId) {
      throw new ForbiddenException('Authenticated supplier required.');
    }

    if (!authContext.roles.includes('supplier_user') && !authContext.roles.includes('platform_admin')) {
      throw new ForbiddenException('Supplier access required.');
    }
  }

  listProducts(query?: unknown) {
    return this.catalogProductRepository.listProducts(true, listProductsQuerySchema.parse(query ?? {}));
  }

  async listSupplierProducts(query: unknown, authContext: AuthContext) {
    this.ensureAuthenticatedSupplier(authContext);
    const sellerProfile = await this.catalogProductRepository.getSellerProfileByUserId(authContext.internalUserId!);
    return this.catalogProductRepository.listSupplierProducts(sellerProfile.id, supplierProductListQuerySchema.parse(query ?? {}));
  }

  async getSupplierProductById(id: string, authContext: AuthContext) {
    this.ensureAuthenticatedSupplier(authContext);
    const sellerProfile = await this.catalogProductRepository.getSellerProfileByUserId(authContext.internalUserId!);
    return this.catalogProductRepository.getSupplierProductById(id, sellerProfile.id);
  }

  listPublicCategories() {
    return this.catalogProductRepository.listCategories();
  }

  listPublicProducts(query?: unknown) {
    return this.catalogProductRepository.listProducts(false, listProductsQuerySchema.parse(query ?? {}));
  }

  getPublicProductBySlug(slug: string) {
    return this.catalogProductRepository.getProductBySlug(slug, false);
  }

  listPublicAuctions(query?: unknown) {
    return this.catalogProductRepository.listAuctions(listProductsQuerySchema.parse(query ?? {}));
  }

  listPublicPreorders(query?: unknown) {
    return this.catalogProductRepository.listPreorders(listProductsQuerySchema.parse(query ?? {}));
  }

  async placeAuctionBid(auctionId: string, input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    this.ensureAuthenticatedBuyer(authContext);
    const buyerProfile = await this.catalogProductRepository.getBuyerProfileByUserId(authContext.internalUserId!);
    const bid = await this.catalogProductRepository.placeAuctionBid(
      auctionId,
      buyerProfile.id,
      auctionBidSchema.parse(input).amountMinor
    );

    await this.auditService.record({
      module: 'catalog-product',
      eventType: 'catalog.auction.bid.created',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'product-auction-bid',
      subjectId: bid.id,
      payload: {
        auctionId,
        buyerProfileId: buyerProfile.id,
        amountMinor: bid.amountMinor
      }
    });

    return bid;
  }

  async createPreorderReservation(productId: string, input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    this.ensureAuthenticatedBuyer(authContext);
    const buyerProfile = await this.catalogProductRepository.getBuyerProfileByUserId(authContext.internalUserId!);
    const parsed = preorderReservationSchema.parse(input);
    const reservation = await this.catalogProductRepository.createPreorderReservation(
      productId,
      buyerProfile.id,
      parsed.quantity,
      parsed.note
    );

    await this.auditService.record({
      module: 'catalog-product',
      eventType: 'catalog.preorder.reservation.created',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'product-preorder-reservation',
      subjectId: reservation.id,
      payload: {
        productId,
        buyerProfileId: buyerProfile.id,
        quantity: reservation.quantity,
        totalAmountMinor: reservation.totalAmountMinor
      }
    });

    return reservation;
  }

  async createProduct(input: unknown, auditContext: RequestAuditContext) {
    if (!auditContext.roles.includes('platform_admin') && !auditContext.roles.includes('supplier_user')) {
      throw new ForbiddenException('Supplier access required.');
    }

    if (!auditContext.roles.includes('platform_admin')) {
      await this.complianceCoreService?.requireSupplierApproval({
        isAuthenticated: true,
        subject: auditContext.actorId,
        email: null,
        username: null,
        internalUserId: auditContext.actorId,
        tenantId: auditContext.tenantId,
        tenantIds: auditContext.tenantId ? [auditContext.tenantId] : [],
        roles: auditContext.roles,
        permissions: [],
        tokenIssuer: null
      });
    }

    const product = await this.catalogProductRepository.createProduct(createProductSchema.parse(input));

    await this.auditService.record({
      module: 'catalog-product',
      eventType: 'catalog.product.created',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'product',
      subjectId: product.id,
      payload: {
        slug: product.slug,
        sku: product.sku,
        status: product.status,
        targetMarket: product.targetMarket
      }
    });

    return product;
  }

  async createSupplierProduct(input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    this.ensureAuthenticatedSupplier(authContext);
    await this.requireSupplierApproval(auditContext);
    const sellerProfile = await this.catalogProductRepository.getSellerProfileByUserId(authContext.internalUserId!);
    const parsed = this.normalizeSupplierProductPayload(supplierProductPayloadSchema.parse(input));
    const identifiers = await this.catalogProductRepository.generateUniqueProductIdentity(
      parsed.name,
      parsed.slug,
      parsed.sku
    );

    const product = await this.catalogProductRepository.createSupplierProduct(
      this.toUpsertSupplierProductInput(sellerProfile.id, parsed, identifiers.slug, identifiers.sku)
    );

    await this.auditService.record({
      module: 'catalog-product',
      eventType: 'catalog.product.created',
      actorId: auditContext.actorId,
      tenantId: sellerProfile.tenantId ?? auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'product',
      subjectId: product.id,
      payload: {
        slug: product.slug,
        sku: product.sku,
        status: product.status,
        targetMarket: product.targetMarket,
        sellerProfileId: sellerProfile.id
      }
    });

    return product;
  }

  async updateSupplierProduct(id: string, input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    this.ensureAuthenticatedSupplier(authContext);
    await this.requireSupplierApproval(auditContext);
    const sellerProfile = await this.catalogProductRepository.getSellerProfileByUserId(authContext.internalUserId!);
    const existing = await this.catalogProductRepository.getSupplierProductById(id, sellerProfile.id);
    const parsed = this.normalizeSupplierProductPayload(supplierProductPayloadSchema.parse(input));
    const identifiers = await this.catalogProductRepository.generateUniqueProductIdentity(
      parsed.name,
      parsed.slug ?? existing.slug,
      parsed.sku ?? existing.sku,
      existing.id
    );

    const product = await this.catalogProductRepository.updateSupplierProduct(
      existing.id,
      sellerProfile.id,
      this.toUpsertSupplierProductInput(sellerProfile.id, parsed, identifiers.slug, identifiers.sku)
    );

    await this.auditService.record({
      module: 'catalog-product',
      eventType: 'catalog.product.updated',
      actorId: auditContext.actorId,
      tenantId: sellerProfile.tenantId ?? auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'product',
      subjectId: product.id,
      payload: {
        status: product.status,
        targetMarket: product.targetMarket,
        sellerProfileId: sellerProfile.id
      }
    });

    return product;
  }

  async aiAssistSupplierProduct(input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    this.ensureAuthenticatedSupplier(authContext);
    await this.requireSupplierApproval(auditContext);
    const parsed = supplierProductAiAssistSchema.parse(input);
    const categoryName = parsed.categoryId
      ? (await this.catalogProductRepository.getCategoryById(parsed.categoryId)).name
      : undefined;
    const suggestion = await this.aiPlatformService.generateProductContent({
      action: parsed.action,
      name: parsed.name,
      ...(parsed.description ? { description: parsed.description } : {}),
      ...(parsed.seoTitle ? { seoTitle: parsed.seoTitle } : {}),
      ...(parsed.metaDescription ? { metaDescription: parsed.metaDescription } : {}),
      categoryName,
      targetMarket: parsed.targetMarket,
      ...(parsed.currency ? { currency: parsed.currency.toUpperCase() } : {}),
      ...(parsed.amountMinor !== undefined ? { amountMinor: parsed.amountMinor } : {}),
      ...(parsed.language ? { language: parsed.language } : {})
    });

    await this.auditService.record({
      module: 'catalog-product',
      eventType: 'catalog.product.ai-assist.generated',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'product-ai-suggestion',
      subjectId: parsed.categoryId ?? authContext.internalUserId!,
      payload: {
        action: parsed.action,
        field: suggestion.field,
        language: suggestion.language ?? null
      }
    });

    return suggestion;
  }

  async publishSupplierProduct(id: string, auditContext: RequestAuditContext, authContext: AuthContext) {
    this.ensureAuthenticatedSupplier(authContext);
    await this.requireSupplierApproval(auditContext);
    const sellerProfile = await this.catalogProductRepository.getSellerProfileByUserId(authContext.internalUserId!);
    const product = await this.catalogProductRepository.publishSupplierProduct(id, sellerProfile.id);

    await this.auditService.record({
      module: 'catalog-product',
      eventType: 'catalog.product.published',
      actorId: auditContext.actorId,
      tenantId: sellerProfile.tenantId ?? auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'product',
      subjectId: product.id,
      payload: {
        status: product.status,
        slug: product.slug
      }
    });

    return product;
  }

  async unpublishSupplierProduct(id: string, auditContext: RequestAuditContext, authContext: AuthContext) {
    this.ensureAuthenticatedSupplier(authContext);
    const sellerProfile = await this.catalogProductRepository.getSellerProfileByUserId(authContext.internalUserId!);
    const product = await this.catalogProductRepository.unpublishSupplierProduct(id, sellerProfile.id);

    await this.auditService.record({
      module: 'catalog-product',
      eventType: 'catalog.product.unpublished',
      actorId: auditContext.actorId,
      tenantId: sellerProfile.tenantId ?? auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'product',
      subjectId: product.id,
      payload: {
        status: product.status,
        slug: product.slug
      }
    });

    return product;
  }

  private async requireSupplierApproval(auditContext: RequestAuditContext) {
    if (!auditContext.roles.includes('platform_admin')) {
      await this.complianceCoreService?.requireSupplierApproval({
        isAuthenticated: true,
        subject: auditContext.actorId,
        email: null,
        username: null,
        internalUserId: auditContext.actorId,
        tenantId: auditContext.tenantId,
        tenantIds: auditContext.tenantId ? [auditContext.tenantId] : [],
        roles: auditContext.roles,
        permissions: [],
        tokenIssuer: null
      });
    }
  }

  private normalizeSupplierProductPayload(input: SupplierProductPayload) {
    const normalizedCurrency = input.currency.toUpperCase();
    const normalizedImageUrls = [...new Set(input.imageUrls.map((value) => value.trim()).filter(Boolean))];
    const hasSale = input.salePriceMinor !== undefined;
    const hasAuction = input.auctionEnabled;
    const hasPreorder = input.isPreorderEnabled || input.availabilityStatus === 'preorder';

    if (hasSale && input.salePriceMinor! >= input.amountMinor) {
      throw new ForbiddenException('Sale price must be lower than the base price.');
    }

    if (input.compareAtAmountMinor !== undefined && input.compareAtAmountMinor < input.amountMinor) {
      throw new ForbiddenException('Compare-at price must be greater than or equal to the base price.');
    }

    if ((input.saleStartsAt && !input.saleEndsAt) || (!input.saleStartsAt && input.saleEndsAt)) {
      throw new ForbiddenException('Sale start and end dates must be provided together.');
    }

    if (input.saleStartsAt && input.saleEndsAt && input.saleEndsAt <= input.saleStartsAt) {
      throw new ForbiddenException('Sale end must be later than sale start.');
    }

    if (hasAuction) {
      if (input.targetMarket === 'b2c') {
        throw new ForbiddenException('Auction mode is only available for wholesale or mixed-market products.');
      }

      if (!input.auctionStartsAt || !input.auctionEndsAt || !input.auctionStartingBidMinor) {
        throw new ForbiddenException('Auction start, end, and starting bid are required.');
      }

      if (input.auctionEndsAt <= input.auctionStartsAt) {
        throw new ForbiddenException('Auction end must be later than auction start.');
      }

      if (input.auctionReserveBidMinor !== undefined && input.auctionReserveBidMinor < input.auctionStartingBidMinor) {
        throw new ForbiddenException('Auction reserve bid must be greater than or equal to the starting bid.');
      }
    }

    if (hasPreorder) {
      if (!input.preorderReleaseAt) {
        throw new ForbiddenException('Preorder release date is required when preorder is enabled.');
      }

      const preorderCap = input.amountMinor * Math.max(1, input.minimumOrderQuantity);
      if (input.preorderDepositAmountMinor !== undefined && input.preorderDepositAmountMinor > preorderCap) {
        throw new ForbiddenException('Preorder deposit cannot exceed the minimum order value.');
      }
    }

    if (input.availabilityStatus === 'preorder' && !input.isPreorderEnabled) {
      input.isPreorderEnabled = true;
    }

    if (!hasPreorder && input.availabilityStatus === 'preorder') {
      throw new ForbiddenException('Preorder availability requires preorder settings.');
    }

    if (!hasPreorder && input.inventoryQuantity === 0 && ['in_stock', 'low_stock'].includes(input.availabilityStatus)) {
      throw new ForbiddenException('In-stock availability requires positive inventory, or switch to preorder/out_of_stock.');
    }

    return {
      ...input,
      seoTitle: input.seoTitle?.trim() || undefined,
      metaDescription: input.metaDescription?.trim() || undefined,
      localizedContent: Object.fromEntries(
        Object.entries(input.localizedContent ?? {})
          .map(([language, value]) => [
            language,
            {
              ...(value.description?.trim() ? { description: value.description.trim() } : {}),
              ...(value.seoTitle?.trim() ? { seoTitle: value.seoTitle.trim() } : {}),
              ...(value.metaDescription?.trim() ? { metaDescription: value.metaDescription.trim() } : {})
            }
          ])
          .filter(([, value]) => typeof value === 'object' && value !== null && Object.keys(value).length > 0)
      ),
      slug: input.slug ? this.slugify(input.slug) : undefined,
      sku: input.sku?.trim().toUpperCase() ?? undefined,
      currency: normalizedCurrency,
      imageUrls: normalizedImageUrls,
      compareAtAmountMinor: hasSale && input.compareAtAmountMinor === undefined ? input.amountMinor : input.compareAtAmountMinor,
      auctionStatus: hasAuction ? this.resolveAuctionStatus(input.auctionStartsAt!) : null as 'scheduled' | 'active' | null
    };
  }

  private toUpsertSupplierProductInput(
    sellerProfileId: string,
    parsed: ReturnType<CatalogProductService['normalizeSupplierProductPayload']>,
    slug: string,
    sku: string
  ): UpsertSupplierProductInput {
    return {
      sellerProfileId,
      categoryId: parsed.categoryId,
      slug,
      sku,
      name: parsed.name,
      description: parsed.description,
      seoTitle: parsed.seoTitle,
      metaDescription: parsed.metaDescription,
      localizedContent: parsed.localizedContent,
      status: parsed.status,
      targetMarket: parsed.targetMarket,
      currency: parsed.currency,
      amountMinor: parsed.amountMinor,
      imageUrls: parsed.imageUrls,
      availabilityStatus: parsed.availabilityStatus,
      inventoryQuantity: parsed.inventoryQuantity,
      leadTimeDays: parsed.leadTimeDays,
      minimumOrderQuantity: parsed.minimumOrderQuantity,
      compareAtAmountMinor: parsed.compareAtAmountMinor,
      salePriceMinor: parsed.salePriceMinor,
      saleStartsAt: parsed.saleStartsAt,
      saleEndsAt: parsed.saleEndsAt,
      auctionEnabled: parsed.auctionEnabled,
      auctionStatus: parsed.auctionStatus,
      auctionStartsAt: parsed.auctionStartsAt,
      auctionEndsAt: parsed.auctionEndsAt,
      auctionStartingBidMinor: parsed.auctionStartingBidMinor,
      auctionReserveBidMinor: parsed.auctionReserveBidMinor,
      isPreorderEnabled: parsed.isPreorderEnabled,
      preorderReleaseAt: parsed.preorderReleaseAt,
      preorderDepositAmountMinor: parsed.preorderDepositAmountMinor
    };
  }

  private slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  private resolveAuctionStatus(startsAt: Date) {
    return startsAt.getTime() > Date.now() ? 'scheduled' : 'active';
  }

}
