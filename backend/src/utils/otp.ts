import crypto from 'crypto';
import { config } from '../config';

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 */
export const generateSecureOTP = (): string => {
  // Generates integer between 100000 and 999999 (inclusive)
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Hashes a plaintext OTP code using HMAC-SHA256 with the application secret/salt.
 * Ensures stored OTP hashes in PostgreSQL cannot be reverse-engineered or used directly.
 */
export const hashOTP = (otp: string, email: string): string => {
  const salt = `${email.toLowerCase()}:${config.jwtSecret}`;
  return crypto.createHmac('sha256', salt).update(otp).digest('hex');
};

/**
 * Timing-safe comparison of provided OTP with stored OTP hash.
 */
export const verifyOTPHash = (otp: string, email: string, storedHash: string): boolean => {
  const computedHash = hashOTP(otp, email);
  
  const computedBuffer = Buffer.from(computedHash, 'hex');
  const storedBuffer = Buffer.from(storedHash, 'hex');

  if (computedBuffer.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(computedBuffer, storedBuffer);
};
