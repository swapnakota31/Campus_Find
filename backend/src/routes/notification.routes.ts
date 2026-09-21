import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.middleware';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../controllers/notification.controller';

const router = Router();
router.use(authenticateUser);
router.get('/', listNotifications);
router.post('/read-all', markAllNotificationsRead);
router.post('/:id/read', markNotificationRead);

export default router;