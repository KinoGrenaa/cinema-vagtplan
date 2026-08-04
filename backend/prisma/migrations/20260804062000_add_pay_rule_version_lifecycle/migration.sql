-- Add lifecycle state for pay-rule versions.
ALTER TABLE "PayRuleVersion"
  ADD COLUMN "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancelledByUserId" INTEGER,
  ADD COLUMN "cancellationReason" TEXT;

ALTER TABLE "PayRuleVersion"
  ADD CONSTRAINT "PayRuleVersion_cancelledByUserId_fkey"
  FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "PayRuleVersion_cancelledByUserId_idx"
  ON "PayRuleVersion"("cancelledByUserId");
