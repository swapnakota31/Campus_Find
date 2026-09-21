import { NotificationType } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AppError } from '../utils/errors';

export class NotificationService {
  async listForUser(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        isRead: true,
        createdAt: true,
      },
    });
  }

  async markRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
      select: { id: true },
    });
    if (!notification) throw new AppError('Notification not found.', 404);

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
      select: { id: true, isRead: true },
    });
  }

  async markAllRead(userId: string) {
    await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    return { updated: true };
  }
}

export const notificationService = new NotificationService();