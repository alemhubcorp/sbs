import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../app/prisma.service.js';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string | undefined;
  entityId?: string | undefined;
  metadata?: Prisma.InputJsonValue | undefined;
}

@Injectable()
export class NotificationRepository {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  listForUser(userId: string, limit = 50) {
    return this.prismaService.client.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  listAll(limit = 50) {
    return this.prismaService.client.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  async getById(id: string) {
    const notification = await this.prismaService.client.notification.findUnique({ where: { id } });
    if (!notification) {
      throw new NotFoundException(`Notification ${id} was not found.`);
    }
    return notification;
  }

  create(input: CreateNotificationInput) {
    return this.prismaService.client.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        ...(input.entityType ? { entityType: input.entityType } : {}),
        ...(input.entityId ? { entityId: input.entityId } : {}),
        ...(input.metadata ? { metadata: input.metadata } : {})
      }
    });
  }

  markRead(id: string) {
    return this.prismaService.client.notification.update({
      where: { id },
      data: { read: true }
    });
  }
}
