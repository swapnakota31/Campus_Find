-- Preserve existing verification data while removing plaintext answer storage.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "VerificationQuestion"
RENAME COLUMN "expectedAnswer" TO "expectedAnswerHash";

ALTER TABLE "VerificationAnswer"
RENAME COLUMN "submittedAnswer" TO "submittedAnswerHash";

UPDATE "VerificationQuestion"
SET "expectedAnswerHash" = encode(
  digest(lower(regexp_replace(trim("expectedAnswerHash"), '\\s+', ' ', 'g')), 'sha256'),
  'hex'
);

UPDATE "VerificationAnswer"
SET "submittedAnswerHash" = encode(
  digest(lower(regexp_replace(trim("submittedAnswerHash"), '\\s+', ' ', 'g')), 'sha256'),
  'hex'
);