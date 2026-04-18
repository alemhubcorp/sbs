import { Body, Controller, Get, Inject, Param, Post, Query, Req } from '@nestjs/common';
import { CurrentAuthContext } from '../../app/current-auth-context.decorator.js';
import { extractRequestAuditContext, type ApiRequestLike } from '../../app/auth-context.js';
import { NotificationService } from './notification.service.js';

@Controller('notifications')
export class NotificationsController {
  constructor(@Inject(NotificationService) private readonly notificationService: NotificationService) {}

  @Get()
  listNotifications(
    @Query() query: Record<string, string | string[] | undefined>,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.notificationService.listNotifications(authContext!, query);
  }

  @Post(':id/read')
  markRead(
    @Param('id') id: string,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    void extractRequestAuditContext(request);
    return this.notificationService.markRead(id, authContext!);
  }
}
