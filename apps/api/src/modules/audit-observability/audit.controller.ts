import { Controller, Get, Inject, Query } from '@nestjs/common';
import { RequirePermissions } from '../../app/permissions.decorator.js';
import { AuditService } from './audit.service.js';

@Controller('audit')
@RequirePermissions('approval.read')
export class AuditController {
  constructor(@Inject(AuditService) private readonly auditService: AuditService) {}

  @Get('events')
  list(@Query() query: unknown) {
    return this.auditService.list(query);
  }
}
