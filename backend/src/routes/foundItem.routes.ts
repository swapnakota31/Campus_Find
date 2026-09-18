import { Router } from 'express';
import {
  createFoundItem,
  getFoundItems,
  getFoundItemById,
  updateFoundItem,
  deleteFoundItem,
} from '../controllers/foundItem.controller';
import { authenticateUser } from '../middleware/auth.middleware';

const router = Router();

// Protect all found item endpoints with authentication middleware
router.use(authenticateUser);

router.post('/', createFoundItem);
router.get('/', getFoundItems);
router.get('/:id', getFoundItemById);
router.patch('/:id', updateFoundItem);
router.delete('/:id', deleteFoundItem);

export default router;
