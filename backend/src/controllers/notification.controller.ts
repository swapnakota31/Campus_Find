import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';

export const listNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(200).json({ status: 'success', data: await notificationService.listForUser(req.user!.userId) });
  } catch (error) { next(error); }
};

export const markNotificationRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(200).json({ status: 'success', data: await notificationService.markRead(req.params.id, req.user!.userId) });
  } catch (error) { next(error); }
};

export const markAllNotificationsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(200).json({ status: 'success', data: await notificationService.markAllRead(req.user!.userId) });
  } catch (error) { next(error); }
};