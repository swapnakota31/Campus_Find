import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../utils/errors';
import { config } from '../config';
import { imageService } from '../services/image.service';
import { canAccessPrivateItemImages } from '../utils/image-access';

/**
 * POST /api/items/lost/:id/images - Upload private image for Lost Item
 */
export const uploadLostItemImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const lostItemId = req.params.id;

    if (!req.file) {
      res.status(400).json({ success: false, message: 'No image file uploaded.' });
      return;
    }

    const lostItem = await prisma.lostItem.findUnique({
      where: { id: lostItemId },
    });

    if (!lostItem) {
      res.status(404).json({ success: false, message: 'Lost item report not found.' });
      return;
    }

    // Ownership check
    if (!canAccessPrivateItemImages(userId, lostItem.userId, req.user!.role)) {
      res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to upload images for this report.' });
      return;
    }

    // Max images count limit
    const existingCount = await prisma.itemImage.count({
      where: { lostItemId },
    });

    if (existingCount >= config.maxImagesPerItem) {
      res.status(400).json({ success: false, message: `Maximum of ${config.maxImagesPerItem} images per item allowed.` });
      return;
    }

    // Upload to Cloudinary as private asset
    const uploadResult = await imageService.uploadPrivateImage(
      req.file.buffer,
      req.file.mimetype,
      'lost',
      lostItemId
    );

    // Create DB record
    const itemImage = await prisma.itemImage.create({
      data: {
        imageUrl: uploadResult.publicId, // Store public_id in imageUrl field
        isPrivate: true,
        lostItemId,
      },
    });

    const signedUrl = imageService.generateSignedAccessUrl(itemImage.imageUrl);

    res.status(201).json({
      success: true,
      data: {
        id: itemImage.id,
        lostItemId: itemImage.lostItemId,
        isPrivate: itemImage.isPrivate,
        signedAccessUrl: signedUrl,
        createdAt: itemImage.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/items/found/:id/images - Upload private image for Found Item
 */
export const uploadFoundItemImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const foundItemId = req.params.id;

    if (!req.file) {
      res.status(400).json({ success: false, message: 'No image file uploaded.' });
      return;
    }

    const foundItem = await prisma.foundItem.findUnique({
      where: { id: foundItemId },
    });

    if (!foundItem) {
      res.status(404).json({ success: false, message: 'Found item report not found.' });
      return;
    }

    // Finder ownership check
    if (!canAccessPrivateItemImages(userId, foundItem.finderId, req.user!.role)) {
      res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to upload images for this report.' });
      return;
    }

    // Max images count limit
    const existingCount = await prisma.itemImage.count({
      where: { foundItemId },
    });

    if (existingCount >= config.maxImagesPerItem) {
      res.status(400).json({ success: false, message: `Maximum of ${config.maxImagesPerItem} images per item allowed.` });
      return;
    }

    // Upload to Cloudinary as private asset
    const uploadResult = await imageService.uploadPrivateImage(
      req.file.buffer,
      req.file.mimetype,
      'found',
      foundItemId
    );

    // Create DB record
    const itemImage = await prisma.itemImage.create({
      data: {
        imageUrl: uploadResult.publicId,
        isPrivate: true,
        foundItemId,
      },
    });

    const signedUrl = imageService.generateSignedAccessUrl(itemImage.imageUrl);

    res.status(201).json({
      success: true,
      data: {
        id: itemImage.id,
        foundItemId: itemImage.foundItemId,
        isPrivate: itemImage.isPrivate,
        signedAccessUrl: signedUrl,
        createdAt: itemImage.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/items/lost/:id/images - Retrieve authorized signed images for Lost Item (Owner Only)
 */
export const getLostItemImages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const lostItemId = req.params.id;

    const lostItem = await prisma.lostItem.findUnique({
      where: { id: lostItemId },
    });

    if (!lostItem) {
      res.status(404).json({ success: false, message: 'Lost item report not found.' });
      return;
    }

    // Ownership Privacy Check: Only owner can view private images
    if (!canAccessPrivateItemImages(userId, lostItem.userId, req.user!.role)) {
      res.status(403).json({ success: false, message: 'Forbidden: Private images are restricted to the report owner.' });
      return;
    }

    const images = await prisma.itemImage.findMany({
      where: { lostItemId },
      orderBy: { createdAt: 'asc' },
    });

    const data = images.map((img) => ({
      id: img.id,
      lostItemId: img.lostItemId,
      isPrivate: img.isPrivate,
      signedAccessUrl: imageService.generateSignedAccessUrl(img.imageUrl),
      createdAt: img.createdAt,
    }));

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/items/found/:id/images - Retrieve authorized signed images for Found Item (Finder Only)
 */
export const getFoundItemImages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const foundItemId = req.params.id;

    const foundItem = await prisma.foundItem.findUnique({
      where: { id: foundItemId },
    });

    if (!foundItem) {
      res.status(404).json({ success: false, message: 'Found item report not found.' });
      return;
    }

    // Finder Privacy Check: Only finder can view private images
    if (!canAccessPrivateItemImages(userId, foundItem.finderId, req.user!.role)) {
      res.status(403).json({ success: false, message: 'Forbidden: Private images are restricted to the report finder.' });
      return;
    }

    const images = await prisma.itemImage.findMany({
      where: { foundItemId },
      orderBy: { createdAt: 'asc' },
    });

    const data = images.map((img) => ({
      id: img.id,
      foundItemId: img.foundItemId,
      isPrivate: img.isPrivate,
      signedAccessUrl: imageService.generateSignedAccessUrl(img.imageUrl),
      createdAt: img.createdAt,
    }));

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/items/lost/:id/images/:imageId - Delete private image from Lost Item (Owner Only)
 */
export const deleteLostItemImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id: lostItemId, imageId } = req.params;

    const lostItem = await prisma.lostItem.findUnique({
      where: { id: lostItemId },
    });

    if (!lostItem) {
      res.status(404).json({ success: false, message: 'Lost item report not found.' });
      return;
    }

    if (!canAccessPrivateItemImages(userId, lostItem.userId, req.user!.role)) {
      res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to delete images from this report.' });
      return;
    }

    const imageRecord = await prisma.itemImage.findFirst({
      where: { id: imageId, lostItemId },
    });

    if (!imageRecord) {
      res.status(404).json({ success: false, message: 'Image record not found for this lost item.' });
      return;
    }

    // Delete asset from storage
    await imageService.deletePrivateImage(imageRecord.imageUrl);

    // Delete DB record
    await prisma.itemImage.delete({
      where: { id: imageId },
    });

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/items/found/:id/images/:imageId - Delete private image from Found Item (Finder Only)
 */
export const deleteFoundItemImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id: foundItemId, imageId } = req.params;

    const foundItem = await prisma.foundItem.findUnique({
      where: { id: foundItemId },
    });

    if (!foundItem) {
      res.status(404).json({ success: false, message: 'Found item report not found.' });
      return;
    }

    if (!canAccessPrivateItemImages(userId, foundItem.finderId, req.user!.role)) {
      res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to delete images from this report.' });
      return;
    }

    const imageRecord = await prisma.itemImage.findFirst({
      where: { id: imageId, foundItemId },
    });

    if (!imageRecord) {
      res.status(404).json({ success: false, message: 'Image record not found for this found item.' });
      return;
    }

    // Delete asset from storage
    await imageService.deletePrivateImage(imageRecord.imageUrl);

    // Delete DB record
    await prisma.itemImage.delete({
      where: { id: imageId },
    });

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
