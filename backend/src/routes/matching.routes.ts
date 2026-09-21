import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.middleware';
import { generateMatch } from '../controllers/matching.controller';

const router = Router();
router.use(authenticateUser);
router.post('/', generateMatch);

export default router;