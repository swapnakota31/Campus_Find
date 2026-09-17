import { Router, Request, Response } from 'express';
import { config } from '../config';
import authRoutes from './auth.routes';

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

export default router;

