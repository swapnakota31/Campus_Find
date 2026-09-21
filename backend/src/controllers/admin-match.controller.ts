import { Request, Response, NextFunction } from 'express';
import { adminMatchService } from '../services/admin-match.service';

export const listAdminMatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await adminMatchService.listPotentialMatches(req.user!.role);
    res.status(200).json({ status: 'success', data });
  } catch (error) { next(error); }
};

export const getAdminMatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await adminMatchService.getMatchDetail(req.params.id, req.user!.role);
    res.status(200).json({ status: 'success', data });
  } catch (error) { next(error); }
};

export const approveAdminMatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await adminMatchService.decideMatch(req.params.id, req.user!.userId, req.user!.role, 'APPROVE', req.body?.reason);
    res.status(200).json({ status: 'success', data });
  } catch (error) { next(error); }
};

export const rejectAdminMatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await adminMatchService.decideMatch(req.params.id, req.user!.userId, req.user!.role, 'REJECT', req.body?.reason);
    res.status(200).json({ status: 'success', data });
  } catch (error) { next(error); }
};