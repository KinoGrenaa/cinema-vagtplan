-- Add explicit resolution audit metadata to shift trades.
CREATE TYPE "ShiftTradeResolutionReason" AS ENUM (
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN_BY_OFFERER',
  'SHIFT_REASSIGNED',
  'SHIFT_UNASSIGNED',
  'SHIFT_DELETED',
  'SHIFT_MOVED'
);

ALTER TABLE "ShiftTrade"
  ADD COLUMN "resolvedAt" TIMESTAMP(3),
  ADD COLUMN "resolvedByUserId" INTEGER,
  ADD COLUMN "resolutionReason" "ShiftTradeResolutionReason";

CREATE INDEX "ShiftTrade_resolvedByUserId_idx" ON "ShiftTrade"("resolvedByUserId");

ALTER TABLE "ShiftTrade"
  ADD CONSTRAINT "ShiftTrade_resolvedByUserId_fkey"
  FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve actor/reason where legacy rows already contain the participant.
UPDATE "ShiftTrade"
SET
  "resolvedByUserId" = "acceptedByUserId",
  "resolutionReason" = 'ACCEPTED'::"ShiftTradeResolutionReason"
WHERE "status" = 'ACCEPTED' AND "acceptedByUserId" IS NOT NULL;

UPDATE "ShiftTrade"
SET
  "resolvedByUserId" = "rejectedByUserId",
  "resolutionReason" = 'REJECTED'::"ShiftTradeResolutionReason"
WHERE "status" = 'REJECTED' AND "rejectedByUserId" IS NOT NULL;
