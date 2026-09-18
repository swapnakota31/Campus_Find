import { Request, Response, NextFunction } from 'express';
import { lostItemService } from '../services/lostItem.service';

/**
 * POST /api/items/lost - Create a new lost item report
 */
export const createLostItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const item = await lostItemService.createLostItem(userId, req.body);

    res.status(201).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/items/lost - Get lost item reports (with optional filtering)
 */
export const getLostItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    const result = await lostItemService.getLostItems(requestingUserId, query);

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
 * GET /api/items/lost/:id - Get single lost item report
 */
export const getLostItemById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requestingUserId = req.user!.userId;
    const item = await lostItemService.getLostItemById(req.params.id, requestingUserId);

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/items/lost/:id - Update lost item report
 */
export const updateLostItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requestingUserId = req.user!.userId;
    const updated = await lostItemService.updateLostItem(req.params.id, requestingUserId, req.body);

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/items/lost/:id - Delete or safe-close lost item report
 */
export const deleteLostItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requestingUserId = req.user!.userId;
    const result = await lostItemService.deleteLostItem(req.params.id, requestingUserId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
