import { Router } from 'express';
import { requestOTP, verifyOTP, getCurrentUser, logout } from '../controllers/auth.controller';
import { authenticateUser } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route POST /api/auth/request-otp
 * @desc Request OTP verification code for college email
 */
router.post('/request-otp', requestOTP);
router.post('/otp-request', requestOTP); // Alias matching API_SPEC.md

/**
 * @route POST /api/auth/verify-otp
 * @desc Verify OTP code and authenticate/register student
 */
router.post('/verify-otp', verifyOTP);
router.post('/otp-verify', verifyOTP); // Alias matching API_SPEC.md

/**
 * @route GET /api/auth/me
 * @desc Get currently authenticated user details
 */
router.get('/me', authenticateUser, getCurrentUser);

/**
 * @route POST /api/auth/logout
 * @desc Logout current user session by clearing auth cookie
 */
router.post('/logout', logout);

export default router;
