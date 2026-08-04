-- Split the legacy all-or-nothing quarter-hour rounding option into two
-- independent choices. Existing rules keep their previous behavior.
ALTER TABLE "JobFunctionTimingRule"
  ADD COLUMN "roundStartDownToQuarter" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "roundEndUpToQuarter" BOOLEAN NOT NULL DEFAULT false;

UPDATE "JobFunctionTimingRule"
SET
  "roundStartDownToQuarter" = "roundToQuarter",
  "roundEndUpToQuarter" = "roundToQuarter";
