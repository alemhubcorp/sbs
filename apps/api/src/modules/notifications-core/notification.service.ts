import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { AuthContext } from '../../app/auth-context.js';
import { ResourceAccessService } from '../../app/resource-access.service.js';
import { EmailService } from './email.service.js';
import { NotificationRepository, type CreateNotificationInput } from './notification.repository.js';

type NotificationListQuery = {
  limit?: number;
};

@Injectable()
export class NotificationService {
  constructor(
    @Inject(NotificationRepository) private readonly notificationRepository: NotificationRepository,
    @Inject(EmailService) private readonly emailService: EmailService,
    @Inject(ResourceAccessService) private readonly resourceAccessService: ResourceAccessService
  ) {}

  async listNotifications(authContext: AuthContext, query: NotificationListQuery = {}) {
    const limit = Math.min(Math.max(Number(query.limit ?? 50), 1), 100);

    if (this.resourceAccessService.isPlatformAdmin(authContext)) {
      return {
        items: await this.notificationRepository.listAll(limit)
      };
    }

    if (!authContext.internalUserId) {
      throw new ForbiddenException('Authentication is required.');
    }

    return {
      items: await this.notificationRepository.listForUser(authContext.internalUserId, limit)
    };
  }

  async markRead(id: string, authContext: AuthContext) {
    const notification = await this.notificationRepository.getById(id);

    if (!this.resourceAccessService.isPlatformAdmin(authContext) && notification.userId !== authContext.internalUserId) {
      throw new ForbiddenException('You cannot update notifications for another user.');
    }

    return this.notificationRepository.markRead(id);
  }

  async emit(input: CreateNotificationInput, eventType = input.type) {
    const notification = await this.notificationRepository.create(input);

    void this.emailService.sendEmail(
      eventType,
      { id: input.userId, email: null, name: null },
      {
        notificationId: notification.id,
        title: input.title,
        message: input.message,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata ?? null
      }
    );

    return notification;
  }

  async emitMany(users: string[], input: Omit<CreateNotificationInput, 'userId'>) {
    const recipients = Array.from(new Set(users.filter(Boolean)));
    return Promise.all(recipients.map((userId) => this.emit({ userId, ...input }, input.type)));
  }
}
