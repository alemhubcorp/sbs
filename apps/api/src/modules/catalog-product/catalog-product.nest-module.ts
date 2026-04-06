import { Module } from '@nestjs/common';
import { CatalogProductController } from './catalog-product.controller.js';
import { CatalogProductRepository } from './catalog-product.repository.js';
import { CatalogProductService } from './catalog-product.service.js';

@Module({
  controllers: [CatalogProductController],
  providers: [CatalogProductRepository, CatalogProductService]
})
export class CatalogProductNestModule {}
