import { Body, Controller, Get, Header, Inject, Param, Patch, Post, Put, Req } from '@nestjs/common';
import { CurrentAuthContext } from '../../app/current-auth-context.decorator.js';
import { extractRequestAuditContext, type ApiRequestLike } from '../../app/auth-context.js';
import { RequirePermissions } from '../../app/permissions.decorator.js';
import { ContractCoreService } from './contract-core.service.js';

@Controller(['contracts', 'contract'])
@RequirePermissions('contract.read')
export class ContractCoreController {
  constructor(@Inject(ContractCoreService) private readonly contractCoreService: ContractCoreService) {}

  @Get()
  listContracts(@CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.contractCoreService.listContracts(authContext!);
  }

  @Get(':id')
  getContractById(@Param('id') id: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.contractCoreService.getContractById(id, authContext!);
  }

  @Post()
  @RequirePermissions('contract.manage')
  createContract(
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.contractCoreService.createContract(body, extractRequestAuditContext(request), authContext!);
  }

  @Post('rfq')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @Header('Surrogate-Control', 'no-store')
  async createMockRfq(@Body() body: unknown, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    const createdRfq = await this.contractCoreService.createContractRfq(body, authContext);

    return {
      status: 'created',
      message: 'RFQ created (mock)',
      data: createdRfq
    };
  }

  @Get('rfq')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @Header('Surrogate-Control', 'no-store')
  listMockRfqs(@CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.contractCoreService.listContractRfqs(authContext);
  }

  @Get('rfq/supplier-inbox')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @Header('Surrogate-Control', 'no-store')
  listSupplierInboxRfqs(@CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.contractCoreService.listSupplierInboxRfqs(authContext);
  }

  @Patch('rfq/:id/status')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @Header('Surrogate-Control', 'no-store')
  updateMockRfqStatus(@Param('id') id: string, @Body() body: unknown, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.contractCoreService.updateContractRfqStatus(id, body, authContext);
  }

  @Post('rfq/:id/accept')
  acceptMockRfq(@Param('id') id: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.contractCoreService.updateContractRfqStatus(id, { status: 'accepted' }, authContext);
  }

  @Post('rfq/:id/reject')
  rejectMockRfq(@Param('id') id: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.contractCoreService.updateContractRfqStatus(id, { status: 'rejected' }, authContext);
  }

  @Post('rfq/:id/quotes')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @Header('Surrogate-Control', 'no-store')
  createRfqQuote(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    const payload = typeof body === 'object' && body !== null ? { ...(body as Record<string, unknown>), rfqId: id } : { rfqId: id };
    return this.contractCoreService.createContractRfqQuote(payload, authContext);
  }

  @Get('quotes')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @Header('Surrogate-Control', 'no-store')
  listRfqQuotes(@CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.contractCoreService.listContractRfqQuotes(authContext);
  }

  @Patch('quotes/:id/status')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @Header('Surrogate-Control', 'no-store')
  updateRfqQuoteStatus(@Param('id') id: string, @Body() body: unknown, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.contractCoreService.updateContractRfqQuoteStatus(id, body, authContext);
  }

  @Post('quotes/:id/accept')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @Header('Surrogate-Control', 'no-store')
  acceptRfqQuote(@Param('id') id: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.contractCoreService.acceptContractRfqQuote(id, authContext);
  }

  @Post('quotes/:id/reject')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @Header('Surrogate-Control', 'no-store')
  rejectRfqQuote(@Param('id') id: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.contractCoreService.rejectContractRfqQuote(id, authContext);
  }

  @Get('deals')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @Header('Surrogate-Control', 'no-store')
  listRfqDeals(@CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.contractCoreService.listContractRfqDeals(authContext);
  }

  @Get('deals/:id')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @Header('Surrogate-Control', 'no-store')
  getRfqDeal(@Param('id') id: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.contractCoreService.getDealById(id, authContext);
  }

  @Get('deals/:id/payment')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @Header('Surrogate-Control', 'no-store')
  getRfqDealPayment(@Param('id') id: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.contractCoreService.getDealPayment(id, authContext);
  }

  @Post('deals/:id/fund')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @Header('Surrogate-Control', 'no-store')
  fundRfqDeal(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.contractCoreService.progressContractRfqDeal(
      id,
      typeof body === 'object' && body !== null ? { ...(body as Record<string, unknown>), action: 'fund' } : { action: 'fund' },
      authContext,
      extractRequestAuditContext(request)
    );
  }

  @Post('deals/:id/ship')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @Header('Surrogate-Control', 'no-store')
  shipRfqDeal(@Param('id') id: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.contractCoreService.progressContractRfqDeal(id, 'ship', authContext);
  }

  @Post('deals/:id/payment-method')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @Header('Surrogate-Control', 'no-store')
  setRfqDealPaymentMethod(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.contractCoreService.selectDealPaymentMethod(id, body, extractRequestAuditContext(request), authContext);
  }

  @Post('deals/:id/confirm')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @Header('Surrogate-Control', 'no-store')
  confirmRfqDeal(@Param('id') id: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.contractCoreService.progressContractRfqDeal(id, 'confirm', authContext);
  }

  @Post('deals/:id/dispute')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @Header('Surrogate-Control', 'no-store')
  disputeRfqDeal(@Param('id') id: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.contractCoreService.progressContractRfqDeal(id, 'dispute', authContext);
  }

  @Post(':id/versions')
  @RequirePermissions('contract.manage')
  createContractVersion(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.contractCoreService.createContractVersion(id, body, extractRequestAuditContext(request), authContext!);
  }

  @Put(':id/status')
  @RequirePermissions('contract.manage')
  updateContractStatus(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.contractCoreService.updateContractStatus(id, body, extractRequestAuditContext(request), authContext!);
  }
}
