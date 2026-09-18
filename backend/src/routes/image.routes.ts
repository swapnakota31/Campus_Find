import { Router } from 'express';
import {
  uploadLostItemImage,
  uploadFoundItemImage,
  getLostItemImages,
  getFoundItemImages,
  deleteLostItemImage,
  deleteFoundItemImage,
} from '../controllers/image.controller';
import { authenticateUser } from '../middleware/auth.middleware';
import { uploadSingleImage } from '../middleware/upload.middleware';

const router = Router();

router.use(authenticateUser);

// Lost Item Image Endpoints
router.post('/lost/:id/images', uploadSingleImage, uploadLostItemImage);
router.get('/lost/:id/images', getLostItemImages);
router.delete('/lost/:id/images/:imageId', deleteLostItemImage);

// Found Item Image Endpoints
router.post('/found/:id/images', uploadSingleImage, uploadFoundItemImage);
router.get('/found/:id/images', getFoundItemImages);
router.delete('/found/:id/images/:imageId', deleteFoundFoundItemImageHelper);

function deleteFoundFoundItemImageHelper(req: any, res: any, next: any) {
  return deleteFoundItemImage(req, res, next);
}

export default router;
