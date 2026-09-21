import { Request, Response, NextFunction } from 'express';
import { matchingService } from '../services/matching.service';

export const generateMatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { lostItemId, foundItemId } = req.body || {};
    if (typeof lostItemId !== 'string' || typeof foundItemId !== 'string') {
      res.status(400).json({ status: 'error', message: 'lostItemId and foundItemId are required.' });
      return;
    }
    const match = await matchingService.generateMatch(
      lostItemId,
      foundItemId,
      req.user!.userId,
      req.user!.role
    );
    res.status(match ? 201 : 200).json({
      status: 'success',
      data: match,
      message: match ? 'Potential match generated.' : 'Reports did not exceed the matching threshold.',
    });
  } catch (error) { next(error); }
};