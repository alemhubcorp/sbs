import { Body, Controller, Get, Inject, Post, Put, Req } from '@nestjs/common';
import { extractRequestAuditContext, type ApiRequestLike } from '../../app/auth-context.js';
import { CurrentAuthContext } from '../../app/current-auth-context.decorator.js';
import { RequirePermissions } from '../../app/permissions.decorator.js';
import { Public } from '../../app/public.decorator.js';
import { CatalogProductService } from './catalog-product.service.js';

@Controller('catalog')
export class CatalogProductController {
  constructor(@Inject(CatalogProductService) private readonly catalogProductService: CatalogProductService) {}

  @Get('categories')
  @RequirePermissions('catalog.read')
  listCategories() {
    return this.catalogProductService.listCategories();
  }

  @Post('categories')
  @RequirePermissions('catalog.manage')
  createCategory(@Body() body: unknown, @Req() request: ApiRequestLike) {
    return this.catalogProductService.createCategory(body, extractRequestAuditContext(request));
  }

  @Get('seller-profiles')
  @RequirePermissions('catalog.read')
  listSellerProfiles() {
    return this.catalogProductService.listSellerProfiles();
  }

  @Get('seller-profiles/me')
  @RequirePermissions('catalog.read')
  getCurrentSellerProfile(@CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.catalogProductService.getCurrentSellerProfile(authContext!);
  }

  @Put('seller-profiles/me/payout-settings')
  @RequirePermissions('catalog.read')
  updateCurrentSellerPayoutSettings(
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.catalogProductService.updateCurrentSellerPayoutSettings(body, extractRequestAuditContext(request), authContext!);
  }

  @Post('seller-profiles')
  @RequirePermissions('catalog.manage')
  createSellerProfile(@Body() body: unknown, @Req() request: ApiRequestLike) {
    return this.catalogProductService.createSellerProfile(body, extractRequestAuditContext(request));
  }

  @Get('buyer-profiles')
  @RequirePermissions('catalog.read')
  listBuyerProfiles() {
    return this.catalogProductService.listBuyerProfiles();
  }

  @Post('buyer-profiles')
  @RequirePermissions('catalog.manage')
  createBuyerProfile(@Body() body: unknown, @Req() request: ApiRequestLike) {
    return this.catalogProductService.createBuyerProfile(body, extractRequestAuditContext(request));
  }

  @Get('products')
  @RequirePermissions('catalog.read')
  listProducts() {
    return this.catalogProductService.listProducts();
  }

  @Get('public/products')
  @Public()
  listPublicProducts() {
    return this.catalogProductService.listPublicProducts();
  }

  @Post('products')
  @RequirePermissions('catalog.manage')
  createProduct(@Body() body: unknown, @Req() request: ApiRequestLike) {
    return this.catalogProductService.createProduct(body, extractRequestAuditContext(request));
  }
}
