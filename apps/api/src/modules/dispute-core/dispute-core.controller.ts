import { Body, Controller, Get, Inject, Param, Post, Put, Req } from '@nestjs/common';
import { extractRequestAuditContext, type ApiRequestLike } from '../../app/auth-context.js';
import { RequirePermissions } from '../../app/permissions.decorator.js';
import { DisputeCoreService } from './dispute-core.service.js';

@Controller('disputes')
@RequirePermissions('dispute.read')
export class DisputeCoreController {
  constructor(@Inject(DisputeCoreService) private readonly disputeCoreService: DisputeCoreService) {}

  @Get()
  listDisputes() {
    return this.disputeCoreService.listDisputes();
  }

  @Get(':id')
  getDisputeById(@Param('id') id: string) {
    return this.disputeCoreService.getDisputeById(id);
  }

  @Post()
  @RequirePermissions('dispute.manage')
  createDispute(@Body() body: unknown, @Req() request: ApiRequestLike) {
    return this.disputeCoreService.createDispute(body, extractRequestAuditContext(request));
  }

  @Put(':id/status')
  @RequirePermissions('dispute.manage')
  updateDisputeStatus(@Param('id') id: string, @Body() body: unknown, @Req() request: ApiRequestLike) {
    return this.disputeCoreService.updateDisputeStatus(id, body, extractRequestAuditContext(request));
  }
}
