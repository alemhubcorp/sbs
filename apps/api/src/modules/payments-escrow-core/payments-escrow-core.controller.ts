import { Body, Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import { CurrentAuthContext } from '../../app/current-auth-context.decorator.js';
import { extractRequestAuditContext, type ApiRequestLike } from '../../app/auth-context.js';
import { RequirePermissions } from '../../app/permissions.decorator.js';
import { PaymentsEscrowCoreService } from './payments-escrow-core.service.js';

@Controller('payments')
@RequirePermissions('payment.read')
export class PaymentsEscrowCoreController {
  constructor(
    @Inject(PaymentsEscrowCoreService) private readonly paymentsEscrowCoreService: PaymentsEscrowCoreService
  ) {}

  @Get('transactions')
  listTransactions(@CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.paymentsEscrowCoreService.listTransactions(authContext!);
  }

  @Get('transactions/:id')
  getTransactionById(@Param('id') id: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.paymentsEscrowCoreService.getTransactionById(id, authContext!);
  }

  @Post('transactions')
  @RequirePermissions('payment.manage')
  createTransaction(
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.paymentsEscrowCoreService.createTransaction(body, extractRequestAuditContext(request), authContext!);
  }

  @Post('transactions/:id/hold')
  @RequirePermissions('payment.manage')
  holdFunds(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.paymentsEscrowCoreService.holdFunds(id, body, extractRequestAuditContext(request), authContext!);
  }

  @Post('transactions/:id/release')
  @RequirePermissions('payment.manage')
  releaseFunds(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.paymentsEscrowCoreService.releaseFunds(id, body, extractRequestAuditContext(request), authContext!);
  }

  @Post('transactions/:id/refund')
  @RequirePermissions('payment.manage')
  refundFunds(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.paymentsEscrowCoreService.refundFunds(id, body, extractRequestAuditContext(request), authContext!);
  }

  @Post('transactions/:id/payout-failed')
  @RequirePermissions('payment.manage')
  markPayoutFailed(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.paymentsEscrowCoreService.markPayoutFailed(id, body, extractRequestAuditContext(request), authContext!);
  }
}
