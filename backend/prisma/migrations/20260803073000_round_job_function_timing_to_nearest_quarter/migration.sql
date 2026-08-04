-- The two independent rounding choices now both mean rounding to the nearest quarter.
-- Rename the columns so the database contract matches the product language.
ALTER TABLE "JobFunctionTimingRule"
  RENAME COLUMN "roundStartDownToQuarter" TO "roundStartToNearestQuarter";

ALTER TABLE "JobFunctionTimingRule"
  RENAME COLUMN "roundEndUpToQuarter" TO "roundEndToNearestQuarter";
