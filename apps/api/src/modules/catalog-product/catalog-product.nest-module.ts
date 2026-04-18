import { Module } from '@nestjs/common';
import { ComplianceCoreNestModule } from '../compliance-core/compliance-core.nest-module.js';
import { CatalogProductController } from './catalog-product.controller.js';
import { CatalogProductRepository } from './catalog-product.repository.js';
import { CatalogProductService } from './catalog-product.service.js';

@Module({
  imports: [ComplianceCoreNestModule],
  controllers: [CatalogProductController],
  providers: [CatalogProductRepository, CatalogProductService]
})
export class CatalogProductNestModule {}
