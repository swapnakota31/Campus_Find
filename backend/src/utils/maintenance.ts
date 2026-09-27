import { prisma } from './prisma';

export interface RuntimeValidationInput {
  nodeEnv?: string;
  databaseUrl?: string;
  jwtSecret?: string;
  allowedEmailDomains?: string[];
}

const DEFAULT_DEV_JWT_SECRET = 'campusfind-dev-jwt-secret-key-change-in-prod';

export function validateEnvironmentForRuntime(
  input: RuntimeValidationInput = {}
): boolean {
  const nodeEnv = (input.nodeEnv ?? process.env.NODE_ENV ?? 'development').toLowerCase();
  const databaseUrl = input.databaseUrl ?? process.env.DATABASE_URL ?? '';
  const jwtSecret = input.jwtSecret ?? process.env.JWT_SECRET ?? DEFAULT_DEV_JWT_SECRET;
  const allowedEmailDomains =
    input.allowedEmailDomains ??
    ((process.env.ALLOWED_EMAIL_DOMAINS ?? 'gecgudlavallerumic.in')
      .split(',')
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean));

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

export async function cleanupExpiredOTPs(): Promise<number> {
  const now = new Date();

  const result = await prisma.oTP.deleteMany({
    where: {
      OR: [
        { usedAt: { not: null } },
        { expiresAt: { lt: now } },
      ],
    },
  });

  return result.count;
}
