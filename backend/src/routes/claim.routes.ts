import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  approveClaim,
  cancelClaim,
  createClaim,
  createVerificationQuestion,
  getClaim,
  getClaimQuestions,
  getAdminClaim as getAdminClaimHandler,
  listAdminClaims,
  listMyClaims,
  listVerificationQuestions,
  rejectClaim,
  verifyClaim,
} from '../controllers/claim.controller';
import { authenticateUser, requireRole } from '../middleware/auth.middleware';

const claimsRouter = Router();
claimsRouter.use(authenticateUser);
claimsRouter.post('/', requireRole(Role.STUDENT), createClaim);
claimsRouter.get('/my', requireRole(Role.STUDENT), listMyClaims);
claimsRouter.get('/:id/verification-questions', getClaimQuestions);
claimsRouter.post('/:id/verify', requireRole(Role.STUDENT), verifyClaim);
claimsRouter.post('/:id/cancel', requireRole(Role.STUDENT), cancelClaim);
claimsRouter.get('/:id', getClaim);

const questionRouter = Router();
questionRouter.use(authenticateUser);
questionRouter.post('/:foundItemId/verification-questions', requireRole(Role.STUDENT), createVerificationQuestion);
questionRouter.get('/:foundItemId/verification-questions', listVerificationQuestions);

const adminRouter = Router();
adminRouter.use(authenticateUser, requireRole(Role.ADMIN));
adminRouter.get('/', listAdminClaims);
adminRouter.get('/:id', getAdminClaimHandler);
adminRouter.post('/:id/approve', approveClaim);
adminRouter.post('/:id/reject', rejectClaim);

export { claimsRouter, questionRouter, adminRouter };