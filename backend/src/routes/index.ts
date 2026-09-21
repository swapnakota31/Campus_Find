import { Router, Request, Response } from 'express';
import { config } from '../config';
import authRoutes from './auth.routes';
import lostItemRoutes from './lostItem.routes';
import foundItemRoutes from './foundItem.routes';
import imageRoutes from './image.routes';
import { adminRouter, claimsRouter, questionRouter } from './claim.routes';
import matchingRoutes from './matching.routes';
import adminMatchRoutes from './admin-match.routes';

const router = Router();

/**
 * @route GET /api/health
 * @desc Lightweight backend liveness check
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'CampusFind API Backend is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

/**
 * Authentication Routes Binding
 * Accessible at both /api/auth/* and /api/v1/auth/*
 */
router.use('/auth', authRoutes);
router.use('/v1/auth', authRoutes);

/**
 * Image Management Routes Binding (Must be mounted before item base routes or handled cleanly)
 */
router.use('/items', imageRoutes);
router.use('/v1/items', imageRoutes);

/**
 * Items Reporting Routes Binding
 * Accessible at /api/items/lost, /api/items/found, /api/v1/items/lost, /api/v1/items/found
 */
router.use('/items/lost', lostItemRoutes);
router.use('/v1/items/lost', lostItemRoutes);

router.use('/items/found', foundItemRoutes);
router.use('/v1/items/found', foundItemRoutes);

router.use('/claims', claimsRouter);
router.use('/v1/claims', claimsRouter);
router.use('/found-items', questionRouter);
router.use('/v1/found-items', questionRouter);
router.use('/admin/claims', adminRouter);
router.use('/v1/admin/claims', adminRouter);
router.use('/matching', matchingRoutes);
router.use('/v1/matching', matchingRoutes);
router.use('/admin/matches', adminMatchRoutes);
router.use('/v1/admin/matches', adminMatchRoutes);

export default router;



