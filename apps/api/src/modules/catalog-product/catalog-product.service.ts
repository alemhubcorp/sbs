import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { RequestAuditContext } from '../../app/auth-context.js';
import { AuditService } from '../audit-observability/audit.service.js';
import { CatalogProductRepository } from './catalog-product.repository.js';

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
  displayName: z.string().min(1).max(120)
});

const createBuyerProfileSchema = z.object({
  userId: z.string().min(1).optional(),
  tenantId: z.string().min(1).optional(),
  buyerType: z.enum(['consumer', 'business']),
  displayName: z.string().min(1).max(120)
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
  amountMinor: z.coerce.number().int().min(0)
});

@Injectable()
export class CatalogProductService {
  constructor(
    @Inject(CatalogProductRepository) private readonly catalogProductRepository: CatalogProductRepository,
    @Inject(AuditService) private readonly auditService: AuditService
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

  listProducts() {
    return this.catalogProductRepository.listProducts(true);
  }

  listPublicProducts() {
    return this.catalogProductRepository.listProducts(false);
  }

  async createProduct(input: unknown, auditContext: RequestAuditContext) {
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
}
