ALTER TABLE "Handover"
ADD COLUMN "finderConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "claimantConfirmed" BOOLEAN NOT NULL DEFAULT false;