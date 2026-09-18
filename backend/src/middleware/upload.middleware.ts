import multer from 'multer';
import { Request } from 'express';
import { AppError } from '../utils/errors';
import { config } from '../config';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new AppError(
        `Invalid file format '${file.mimetype}'. Only JPEG, PNG, and WebP images are allowed.`,
        400
      )
    );
  }
  cb(null, true);
};

export const uploadSingleImage = multer({
  storage,
  limits: {
    fileSize: config.maxImageSizeBytes, // Default 5 MB
  },
  fileFilter,
}).single('image');
