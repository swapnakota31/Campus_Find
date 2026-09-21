import {
  hashVerificationAnswer,
  verifyVerificationAnswer,
} from '../utils/verification';
import { canAccessPrivateItemImages } from '../utils/image-access';
import { Role } from '@prisma/client';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`PASS: ${message}`);
}

const answer = '  Blue   zipper  ';
const hash = hashVerificationAnswer(answer);

assert(hash.length === 64, 'Verification answers are stored as SHA-256 hashes');
assert(!hash.includes('blue'), 'Verification hash does not contain plaintext answer');
assert(verifyVerificationAnswer('blue zipper', hash), 'Normalized answer comparison succeeds');
assert(!verifyVerificationAnswer('red zipper', hash), 'Incorrect answer comparison fails');
assert(
  canAccessPrivateItemImages('student-a', 'student-a', Role.STUDENT),
  'Item owner can access private images'
);
assert(
  !canAccessPrivateItemImages('student-a', 'student-b', Role.STUDENT),
  'Other students cannot access private images'
);
assert(
  canAccessPrivateItemImages('admin-a', 'student-b', Role.ADMIN),
  'Admins can access private images for moderation'
);

console.log('Verification security tests passed.');