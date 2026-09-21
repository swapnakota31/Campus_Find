import crypto from 'crypto';

/**
 * Normalize answers consistently before hashing or comparison.
 * Raw answers never need to leave this process.
 */
export const normalizeVerificationAnswer = (answer: string): string => {
  return answer.trim().replace(/\s+/g, ' ').toLowerCase();
};

export const hashVerificationAnswer = (answer: string): string => {
  return crypto
    .createHash('sha256')
    .update(normalizeVerificationAnswer(answer), 'utf8')
    .digest('hex');
};

export const verifyVerificationAnswer = (answer: string, answerHash: string): boolean => {
  const computedHash = Buffer.from(hashVerificationAnswer(answer), 'hex');
  const storedHash = Buffer.from(answerHash, 'hex');

  if (computedHash.length !== storedHash.length) {
    return false;
  }

  return crypto.timingSafeEqual(computedHash, storedHash);
};