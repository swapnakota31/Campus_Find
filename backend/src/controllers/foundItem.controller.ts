import { Request, Response, NextFunction } from 'express';
import { foundItemService } from '../services/foundItem.service';

/**
 * POST /api/items/found - Create a new found item report
 */
export const createFoundItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const finderId = req.user!.userId;
    const item = await foundItemService.createFoundItem(finderId, req.body);

    res.status(201).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/items/found - Get found item reports (public listing with privacy safeguards)
 */
export const getFoundItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requestingUserId = req.user!.userId;
    const query = {
      category: req.query.category as string,
      status: req.query.status as string,
      search: req.query.search as string,
      myItems: req.query.myItems === 'true',
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    };

    const result = await foundItemService.getFoundItems(requestingUserId, query);

    res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/items/found/:id - Get single found item report
 */
export const getFoundItemById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requestingUserId = req.user!.userId;
    const item = await foundItemService.getFoundItemById(req.params.id, requestingUserId);

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/items/found/:id - Update found item report
 */
export const updateFoundItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requestingUserId = req.user!.userId;
    const updated = await foundItemService.updateFoundItem(req.params.id, requestingUserId, req.body);

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/items/found/:id - Delete or safe-close found item report
 */
export const deleteFoundItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requestingUserId = req.user!.userId;
    const result = await foundItemService.deleteFoundItem(req.params.id, requestingUserId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
