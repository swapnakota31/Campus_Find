import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from '../utils/errors';
import { Role } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  collegeEmail: string;
  role: Role;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware to authenticate requests via HTTP-only cookie or Authorization header.
 */
export const authenticateUser = (req: Request, res: Response, next: NextFunction): void => {
  let token: string | undefined;

  // 1. Read from HTTP-only cookie
  if (req.cookies && req.cookies.campusfind_session) {
    token = req.cookies.campusfind_session;
  }
  // 2. Fallback: Read from Authorization header
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Authentication required. Please log in.', 401));
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return next(new AppError('Invalid or expired authentication session. Please log in again.', 401));
  }
};

/**
 * Middleware for role-based authorization checks.
 */
export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Forbidden: insufficient permissions.', 403));
    }

    next();
  };
};
