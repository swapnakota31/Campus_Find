import { Request, Response, NextFunction } from 'express';
import { handoverService } from '../services/handover.service';

export const confirmAdminHandover = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await handoverService.confirmHandover(req.params.id, req.user!.userId, req.user!.role);
    res.status(200).json({ status: 'success', data });
  } catch (error) { next(error); }
};

export const confirmFinderHandover = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(200).json({ status: 'success', data: await handoverService.confirmFinderHandover(req.params.id, req.user!.userId) });
  } catch (error) { next(error); }
};

export const confirmClaimantReceipt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(200).json({ status: 'success', data: await handoverService.confirmClaimantReceipt(req.params.id, req.user!.userId) });
  } catch (error) { next(error); }
};