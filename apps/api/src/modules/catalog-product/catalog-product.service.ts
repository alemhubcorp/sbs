import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { AuthContext, RequestAuditContext } from '../../app/auth-context.js';
import { AuditService } from '../audit-observability/audit.service.js';
import { ComplianceCoreService } from '../compliance-core/compliance-core.service.js';
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
  amountMinor: z.coerce.number().int().min(0)
});

@Injectable()
export class CatalogProductService {
  constructor(
    @Inject(CatalogProductRepository) private readonly catalogProductRepository: CatalogProductRepository,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(ComplianceCoreService) private readonly complianceCoreService: ComplianceCoreService
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

  private ensureAuthenticatedSupplier(authContext: AuthContext) {
    if (!authContext?.isAuthenticated || !authContext.internalUserId) {
      throw new ForbiddenException('Authenticated supplier required.');
    }

    if (!authContext.roles.includes('supplier_user') && !authContext.roles.includes('platform_admin')) {
      throw new ForbiddenException('Supplier access required.');
    }
  }

  listProducts() {
    return this.catalogProductRepository.listProducts(true);
  }

  listPublicProducts() {
    return this.catalogProductRepository.listProducts(false);
  }

  async createProduct(input: unknown, auditContext: RequestAuditContext) {
    if (!auditContext.roles.includes('platform_admin') && !auditContext.roles.includes('supplier_user')) {
      throw new ForbiddenException('Supplier access required.');
    }

    if (!auditContext.roles.includes('platform_admin')) {
      await this.complianceCoreService.requireSupplierApproval({
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
}
