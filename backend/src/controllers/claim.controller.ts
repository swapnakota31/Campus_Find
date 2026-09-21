import { Request, Response, NextFunction } from 'express';
import { claimService } from '../services/claim.service';

export const createClaim = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const claim = await claimService.createClaim(req.user!.userId, req.body);
    res.status(201).json({ status: 'success', data: claim });
  } catch (error) { next(error); }
};

export const listMyClaims = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(200).json({ status: 'success', data: await claimService.listMyClaims(req.user!.userId) });
  } catch (error) { next(error); }
};

export const getClaim = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(200).json({ status: 'success', data: await claimService.getClaim(req.params.id, req.user!.userId, req.user!.role) });
  } catch (error) { next(error); }
};

export const listFoundItemClaims = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await claimService.listClaimsForFoundItem(req.params.foundItemId, req.user!.userId, req.user!.role);
    res.status(200).json({ status: 'success', data });
  } catch (error) { next(error); }
};

export const approveFinderClaim = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await claimService.decideClaimAsFinder(req.params.id, req.user!.userId, 'APPROVE', req.body?.reason);
    res.status(200).json({ status: 'success', data });
  } catch (error) { next(error); }
};

export const rejectFinderClaim = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await claimService.decideClaimAsFinder(req.params.id, req.user!.userId, 'REJECT', req.body?.reason);
    res.status(200).json({ status: 'success', data });
  } catch (error) { next(error); }
};

export const cancelClaim = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(200).json({ status: 'success', data: await claimService.cancelClaim(req.params.id, req.user!.userId) });
  } catch (error) { next(error); }
};

export const createVerificationQuestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await claimService.createQuestion(req.params.foundItemId, req.user!.userId, req.body);
    res.status(201).json({ status: 'success', data });
  } catch (error) { next(error); }
};

export const listVerificationQuestions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await claimService.listQuestions(req.params.foundItemId, req.user!.userId, req.user!.role);
    res.status(200).json({ status: 'success', data });
  } catch (error) { next(error); }
};

export const getClaimQuestions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await claimService.getClaimQuestions(req.params.id, req.user!.userId, req.user!.role);
    res.status(200).json({ status: 'success', data });
  } catch (error) { next(error); }
};

export const verifyClaim = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await claimService.verifyClaim(req.params.id, req.user!.userId, req.body);
    res.status(200).json({ status: 'success', data });
  } catch (error) { next(error); }
};

export const listAdminClaims = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await claimService.listAdminClaims(req.user!.userId, req.query.status);
    res.status(200).json({ status: 'success', data });
  } catch (error) { next(error); }
};

export const getAdminClaim = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(200).json({ status: 'success', data: await claimService.getAdminClaim(req.params.id) });
  } catch (error) { next(error); }
};

export const approveClaim = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await claimService.decideClaim(req.params.id, req.user!.userId, 'APPROVE', req.body?.reason);
    res.status(200).json({ status: 'success', data });
  } catch (error) { next(error); }
};

export const rejectClaim = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await claimService.decideClaim(req.params.id, req.user!.userId, 'REJECT', req.body?.reason);
    res.status(200).json({ status: 'success', data });
  } catch (error) { next(error); }
};
