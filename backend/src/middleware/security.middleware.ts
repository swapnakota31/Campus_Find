import { NextFunction, Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import helmet from 'helmet';

export const securityHeaders = helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-site' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP. Please try again in a few minutes.',
  },
  keyGenerator: (req) => ipKeyGenerator(req.ip || 'unknown-ip'),
});

const shouldSkipAuthRateLimit = (req: Request): boolean => {
  const path = req.originalUrl || req.url || '';
  const normalizedPath = path.split('?')[0];
  return (normalizedPath === '/api/auth/me' || normalizedPath === '/api/v1/auth/me') && req.method === 'GET';
};

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication requests from this device. Please wait before retrying.',
  },
  skip: (req) => shouldSkipAuthRateLimit(req),
  keyGenerator: (req) => `${ipKeyGenerator(req.ip || 'unknown-ip')}:${req.originalUrl || req.path}`,
});

export const requestSanitizer = (req: Request, res: Response, next: NextFunction): void => {
  if (typeof req.headers['x-powered-by'] !== 'undefined') {
    delete req.headers['x-powered-by'];
  }

  next();
};
