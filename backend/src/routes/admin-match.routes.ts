import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticateUser, requireRole } from '../middleware/auth.middleware';
import {
  approveAdminMatch,
  getAdminMatch,
  listAdminMatches,
  rejectAdminMatch,
} from '../controllers/admin-match.controller';

const router = Router();
router.use(authenticateUser, requireRole(Role.ADMIN));
router.get('/', listAdminMatches);
router.get('/:id', getAdminMatch);
router.post('/:id/approve', approveAdminMatch);
router.post('/:id/reject', rejectAdminMatch);

export default router;