import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticateUser, requireRole } from '../middleware/auth.middleware';
import { confirmAdminHandover, confirmClaimantReceipt, confirmFinderHandover } from '../controllers/handover.controller';

const router = Router();
router.use(authenticateUser, requireRole(Role.ADMIN));
router.post('/:id/handover', confirmAdminHandover);

const participantRouter = Router();
participantRouter.use(authenticateUser, requireRole(Role.STUDENT));
participantRouter.post('/:id/finder-confirm', confirmFinderHandover);
participantRouter.post('/:id/receipt-confirm', confirmClaimantReceipt);

export { participantRouter };
export default router;