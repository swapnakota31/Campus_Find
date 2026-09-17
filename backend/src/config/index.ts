import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  allowedEmailDomains: (process.env.ALLOWED_EMAIL_DOMAINS || 'gecgudlavallerumic.in')
    .split(',')
    .map(domain => domain.trim().toLowerCase()),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'campusfind-dev-jwt-secret-key-change-in-prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10),
  otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
  otpCooldownSeconds: parseInt(process.env.OTP_COOLDOWN_SECONDS || '60', 10),
  emailMode: process.env.EMAIL_MODE || 'dev',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPassword: process.env.SMTP_PASSWORD || '',
  emailFrom: process.env.EMAIL_FROM || 'no-reply@campusfind.edu',
};

// Simple configuration sanity check
if (!process.env.DATABASE_URL) {
  console.warn('WARNING: DATABASE_URL is not set in environment variables.');
}

