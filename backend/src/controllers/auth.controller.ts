import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { config } from '../config';

const SESSION_COOKIE_NAME = 'campusfind_session';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Controller for POST /api/auth/request-otp
 */
export const requestOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    const result = await authService.requestOTP(email);

    res.status(200).json({
      status: 'success',
      message: result.message,
      ...(result.devOtp && { devOtp: result.devOtp }),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller for POST /api/auth/verify-otp
 */
export const verifyOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp } = req.body;
    const { token, user } = await authService.verifyOTP(email, otp);

    // Set secure HTTP-only session cookie
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true, // Prevents client-side JS from accessing the cookie
      secure: config.nodeEnv === 'production', // Use HTTPS in production
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });

    res.status(200).json({
      status: 'success',
      message: 'Authenticated successfully.',
      data: {
        token, // Also returned in data for non-browser API clients/testing
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller for GET /api/auth/me
 */
export const getCurrentUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Not authenticated' });
      return;
    }

    const user = await authService.getUserById(req.user.userId);

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller for POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      path: '/',
    });

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};
