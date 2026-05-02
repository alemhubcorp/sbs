import { Body, Controller, Get, Headers, Inject, Param, Post, Query, Req } from '@nestjs/common';
import { CurrentAuthContext } from '../../app/current-auth-context.decorator.js';
import { extractRequestAuditContext, type ApiRequestLike } from '../../app/auth-context.js';
import { RequirePermissions } from '../../app/permissions.decorator.js';
import { Public } from '../../app/public.decorator.js';
import { PaymentOpsService } from './payment-ops.service.js';

@Controller('admin/payments')
@RequirePermissions('admin.access')
export class AdminPaymentOpsController {
  constructor(@Inject(PaymentOpsService) private readonly paymentOpsService: PaymentOpsService) {}

  @Get()
  @RequirePermissions('payment.read')
  listPayments(
    @Query() query: Record<string, string | string[] | undefined>,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.paymentOpsService.listPayments(query, authContext!);
  }

  @Get('review')
  @RequirePermissions('payment.read')
  listReviewQueue(
    @Query() query: Record<string, string | string[] | undefined>,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.paymentOpsService.listReviewQueue(query, authContext!);
  }

  @Get(':id')
  @RequirePermissions('payment.read')
  getPaymentById(@Param('id') id: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.paymentOpsService.getPaymentById(id, authContext!);
  }

  @Post(':id/mark-paid')
  @RequirePermissions('payment.manage')
  markPaid(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.paymentOpsService.markPaid(id, body, extractRequestAuditContext(request), authContext!);
  }

  @Post(':id/reject')
  @RequirePermissions('payment.manage')
  rejectPayment(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.paymentOpsService.rejectPayment(id, body, extractRequestAuditContext(request), authContext!);
  }

  @Post(':id/request-correction')
  @RequirePermissions('payment.manage')
  requestCorrection(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.paymentOpsService.requestCorrection(id, body, extractRequestAuditContext(request), authContext!);
  }

  @Post(':id/upload-proof')
  @RequirePermissions('payment.manage')
  uploadProof(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.paymentOpsService.uploadProof(id, body, extractRequestAuditContext(request), authContext!);
  }
}

@Controller('payments/webhooks')
export class PaymentWebhookController {
  constructor(@Inject(PaymentOpsService) private readonly paymentOpsService: PaymentOpsService) {}

  @Post(':provider')
  @Public()
  ingestWebhook(
    @Param('provider') provider: string,
    @Body() body: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() request: ApiRequestLike
  ) {
    return this.paymentOpsService.ingestWebhook(provider, body, headers, request.rawBody, extractRequestAuditContext(request));
  }
}

@Controller('platform/webhooks')
export class PlatformWebhookCompatibilityController {
  constructor(@Inject(PaymentOpsService) private readonly paymentOpsService: PaymentOpsService) {}

  @Post(':provider')
  @Public()
  ingestWebhook(
    @Param('provider') provider: string,
    @Body() body: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() request: ApiRequestLike
  ) {
    return this.paymentOpsService.ingestWebhook(provider, body, headers, request.rawBody, extractRequestAuditContext(request));
  }
}
