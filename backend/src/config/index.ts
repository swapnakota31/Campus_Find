import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const DEFAULT_DEV_JWT_SECRET = 'campusfind-dev-jwt-secret-key-change-in-prod';

export interface RuntimeValidationInput {
  nodeEnv?: string;
  databaseUrl?: string;
  jwtSecret?: string;
  allowedEmailDomains?: string[];
}

const defaultCorsOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  allowedEmailDomains: (process.env.ALLOWED_EMAIL_DOMAINS || 'gecgudlavallerumic.in')
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean),
  corsOrigins: Array.from(
    new Set([
      ...defaultCorsOrigins,
      ...((process.env.CORS_ORIGIN || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)),
    ])
  ),
  jwtSecret: process.env.JWT_SECRET || DEFAULT_DEV_JWT_SECRET,
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
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  maxImagesPerItem: parseInt(process.env.MAX_IMAGES_PER_ITEM || '5', 10),
  maxImageSizeBytes: parseInt(process.env.MAX_IMAGE_SIZE_BYTES || '5242880', 10), // 5 MB
  imageMatchingProvider: process.env.AI_IMAGE_PROVIDER || 'development-mock',
  maxImageComparisons: parseInt(process.env.AI_MAX_IMAGE_COMPARISONS || '25', 10),
  matchingThreshold: parseFloat(process.env.MATCHING_THRESHOLD || '0.45'),
};

export function validateEnvironmentForRuntime(
  input: RuntimeValidationInput = {}
): boolean {
  const nodeEnv = (input.nodeEnv ?? config.nodeEnv).toLowerCase();
  const databaseUrl = input.databaseUrl ?? config.databaseUrl;
  const jwtSecret = input.jwtSecret ?? config.jwtSecret;
  const allowedEmailDomains =
    input.allowedEmailDomains ??
    config.allowedEmailDomains.filter((domain) => typeof domain === 'string' && domain.length > 0);

  if (nodeEnv !== 'production') {
    return true;
  }

  if (!databaseUrl) {
    return false;
  }

  if (!jwtSecret || jwtSecret === DEFAULT_DEV_JWT_SECRET) {
    return false;
  }

  if (!allowedEmailDomains.length) {
    return false;
  }

  return true;
}

// Simple configuration sanity check
if (!process.env.DATABASE_URL) {
  console.warn('WARNING: DATABASE_URL is not set in environment variables.');
}

if (config.nodeEnv === 'production' && !validateEnvironmentForRuntime()) {
  throw new Error(
    'Production runtime validation failed. Set a real DATABASE_URL, JWT_SECRET, and ALLOWED_EMAIL_DOMAINS.'
  );
}

