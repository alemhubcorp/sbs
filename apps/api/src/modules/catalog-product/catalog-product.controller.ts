import { Body, Controller, Get, Inject, Param, Post, Put, Query, Req } from '@nestjs/common';
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
  listProducts(@Query() query: Record<string, string | undefined>) {
    return this.catalogProductService.listProducts(query);
  }

  @Get('supplier/products')
  @RequirePermissions('catalog.read')
  listSupplierProducts(
    @Query() query: Record<string, string | undefined>,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.catalogProductService.listSupplierProducts(query, authContext!);
  }

  @Get('supplier/products/:id')
  @RequirePermissions('catalog.read')
  getSupplierProductById(
    @Param('id') id: string,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.catalogProductService.getSupplierProductById(id, authContext!);
  }

  @Get('public/products')
  @Public()
  listPublicProducts(@Query() query: Record<string, string | undefined>) {
    return this.catalogProductService.listPublicProducts(query);
  }

  @Get('public/products/:slug')
  @Public()
  getPublicProductBySlug(@Param('slug') slug: string) {
    return this.catalogProductService.getPublicProductBySlug(slug);
  }

  @Get('public/auctions')
  @Public()
  listPublicAuctions(@Query() query: Record<string, string | undefined>) {
    return this.catalogProductService.listPublicAuctions(query);
  }

  @Get('public/preorders')
  @Public()
  listPublicPreorders(@Query() query: Record<string, string | undefined>) {
    return this.catalogProductService.listPublicPreorders(query);
  }

  @Post('auctions/:auctionId/bids')
  @RequirePermissions('catalog.read')
  placeAuctionBid(
    @Param('auctionId') auctionId: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.catalogProductService.placeAuctionBid(auctionId, body, extractRequestAuditContext(request), authContext!);
  }

  @Post('products/:productId/preorders')
  @RequirePermissions('catalog.read')
  createPreorderReservation(
    @Param('productId') productId: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.catalogProductService.createPreorderReservation(productId, body, extractRequestAuditContext(request), authContext!);
  }

  @Post('products')
  @RequirePermissions('catalog.manage')
  createProduct(@Body() body: unknown, @Req() request: ApiRequestLike) {
    return this.catalogProductService.createProduct(body, extractRequestAuditContext(request));
  }

  @Post('supplier/products')
  @RequirePermissions('catalog.manage')
  createSupplierProduct(
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.catalogProductService.createSupplierProduct(body, extractRequestAuditContext(request), authContext!);
  }

  @Put('supplier/products/:id')
  @RequirePermissions('catalog.manage')
  updateSupplierProduct(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.catalogProductService.updateSupplierProduct(id, body, extractRequestAuditContext(request), authContext!);
  }

  @Post('supplier/products/ai-assist')
  @RequirePermissions('catalog.manage')
  aiAssistSupplierProduct(
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.catalogProductService.aiAssistSupplierProduct(body, extractRequestAuditContext(request), authContext!);
  }

  @Post('supplier/products/:id/publish')
  @RequirePermissions('catalog.manage')
  publishSupplierProduct(
    @Param('id') id: string,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.catalogProductService.publishSupplierProduct(id, extractRequestAuditContext(request), authContext!);
  }

  @Post('supplier/products/:id/unpublish')
  @RequirePermissions('catalog.manage')
  unpublishSupplierProduct(
    @Param('id') id: string,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.catalogProductService.unpublishSupplierProduct(id, extractRequestAuditContext(request), authContext!);
  }
}
