import { Router } from 'express';
import {
  createLostItem,
  getLostItems,
  getLostItemById,
  updateLostItem,
  deleteLostItem,
} from '../controllers/lostItem.controller';
import { authenticateUser } from '../middleware/auth.middleware';

const router = Router();

// Protect all lost item endpoints with authentication middleware
router.use(authenticateUser);

router.post('/', createLostItem);
router.get('/', getLostItems);
router.get('/:id', getLostItemById);
router.patch('/:id', updateLostItem);
router.delete('/:id', deleteLostItem);

export default router;
