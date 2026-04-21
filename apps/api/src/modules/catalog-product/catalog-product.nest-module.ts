import { Module } from '@nestjs/common';
import { AiPlatformNestModule } from '../ai-platform/ai-platform.nest-module.js';
import { ComplianceCoreNestModule } from '../compliance-core/compliance-core.nest-module.js';
import { CatalogProductController } from './catalog-product.controller.js';
import { CatalogProductRepository } from './catalog-product.repository.js';
import { CatalogProductService } from './catalog-product.service.js';

@Module({
  imports: [ComplianceCoreNestModule, AiPlatformNestModule],
  controllers: [CatalogProductController],
  providers: [CatalogProductRepository, CatalogProductService]
})
export class CatalogProductNestModule {}
