-- AT3A-001: unify job functions/shifts and add versioned payroll.
-- This migration is intentionally additive for legacy WorkType, DayPeriod and PayrollType data.

-- Normalize a known pre-AT3A schema drift in LeaveRequest creator ownership.
-- The tracked 20260627172000 migration introduced a nullable creator with
-- ON DELETE SET NULL, while the approved/current Prisma model requires an
-- immutable creator reference (NOT NULL + ON DELETE RESTRICT). This block is
-- safe on both fresh databases and databases that were already aligned manually.
ALTER TABLE "LeaveRequest"
  DROP CONSTRAINT IF EXISTS "LeaveRequest_createdByUserId_fkey";

DROP INDEX IF EXISTS "LeaveRequest_createdByUserId_idx";

UPDATE "LeaveRequest"
SET "createdByUserId" = "userId"
WHERE "createdByUserId" IS NULL;

ALTER TABLE "LeaveRequest"
  ALTER COLUMN "createdByUserId" SET NOT NULL;

ALTER TABLE "LeaveRequest"
  ADD CONSTRAINT "LeaveRequest_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Extend the existing adjustment enum before tables reference the new values.
ALTER TYPE "PayrollAdjustmentType" ADD VALUE IF NOT EXISTS 'PAY_RATE_CHANGE';
ALTER TYPE "PayrollAdjustmentType" ADD VALUE IF NOT EXISTS 'PAY_RULE_CHANGE';
ALTER TYPE "PayrollAdjustmentType" ADD VALUE IF NOT EXISTS 'PAYROLL_MODE_CHANGE';
ALTER TYPE "PayrollAdjustmentType" ADD VALUE IF NOT EXISTS 'MANUAL_MONEY_ADJUSTMENT';

CREATE TYPE "PayrollMode" AS ENUM ('HOURS_ONLY', 'SIMPLE', 'ADVANCED');
CREATE TYPE "PayrollVersionStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'SUPERSEDED', 'CANCELLED');
CREATE TYPE "PayRuleKind" AS ENUM ('TIME_WINDOW', 'WEEKDAY', 'WEEKEND', 'HOLIDAY', 'JOB_FUNCTION');
CREATE TYPE "PayRuleStackingMode" AS ENUM ('STACK', 'EXCLUSIVE');
CREATE TYPE "PayCalculationType" AS ENUM ('FIXED_PER_HOUR', 'PERCENT_OF_BASE');
CREATE TYPE "CinemaSpecialDayType" AS ENUM ('PUBLIC_HOLIDAY', 'CUSTOM');
CREATE TYPE "PayrollConfigurationChangeType" AS ENUM ('PAYROLL_MODE', 'PAY_RATE', 'PAY_RULE', 'SPECIAL_DAY');
CREATE TYPE "PayrollCalculationRunStatus" AS ENUM ('PREVIEW', 'LOCKED');
CREATE TYPE "PayrollCalculationLineType" AS ENUM ('HOURS', 'BASE_PAY', 'SUPPLEMENT', 'ADJUSTMENT');
CREATE TYPE "ShiftTimingSource" AS ENUM ('MANUAL', 'JOB_FUNCTION_RULE', 'TEMPLATE', 'MIGRATED');

-- JobFunction becomes the canonical shift definition.
ALTER TABLE "JobFunction"
  ADD COLUMN "nameKey" TEXT,
  ADD COLUMN "defaultPayrollExportCodeId" INTEGER;

UPDATE "JobFunction"
SET "nameKey" = lower(regexp_replace(btrim("name"), '\s+', ' ', 'g'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "JobFunction"
    GROUP BY "cinemaId", "nameKey"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'AT3A migration blocked: duplicate normalized job-function names exist in one or more cinemas';
  END IF;
END $$;

ALTER TABLE "JobFunction" ALTER COLUMN "nameKey" SET NOT NULL;
CREATE UNIQUE INDEX "JobFunction_cinemaId_nameKey_key" ON "JobFunction"("cinemaId", "nameKey");
CREATE INDEX "JobFunction_defaultPayrollExportCodeId_idx" ON "JobFunction"("defaultPayrollExportCodeId");
ALTER TABLE "JobFunction"
  ADD CONSTRAINT "JobFunction_defaultPayrollExportCodeId_fkey"
  FOREIGN KEY ("defaultPayrollExportCodeId") REFERENCES "PayrollType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add the integrated timing-window fields while retaining clampToDayPeriod as a read-only legacy field.
ALTER TABLE "JobFunctionTimingRule"
  ADD COLUMN "filmWindowStartMinute" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "filmWindowEndMinute" INTEGER NOT NULL DEFAULT 1440,
  ADD COLUMN "roundToQuarter" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "limitToFilmWindow" BOOLEAN NOT NULL DEFAULT true;

UPDATE "JobFunctionTimingRule" rule
SET
  "filmWindowStartMinute" = COALESCE(dp."startMinute", 0),
  "filmWindowEndMinute" = CASE
    WHEN dp."startMinute" IS NULL OR dp."endMinute" IS NULL THEN 1440
    WHEN dp."endMinute" <= dp."startMinute" THEN dp."endMinute" + 1440
    ELSE dp."endMinute"
  END,
  "startFixedMinute" = CASE
    WHEN rule."startAnchor"::text = 'DAY_PERIOD_START' THEN dp."startMinute"
    ELSE rule."startFixedMinute"
  END,
  "endFixedMinute" = CASE
    WHEN rule."endAnchor"::text = 'DAY_PERIOD_END' THEN dp."endMinute"
    ELSE rule."endFixedMinute"
  END,
  "fallbackStartMinute" = COALESCE(rule."fallbackStartMinute", dp."startMinute"),
  "fallbackEndMinute" = COALESCE(rule."fallbackEndMinute", dp."endMinute"),
  "limitToFilmWindow" = rule."clampToDayPeriod",
  "roundToQuarter" = false
FROM "JobFunction" jf
LEFT JOIN "DayPeriod" dp ON dp."id" = jf."dayPeriodId"
WHERE jf."id" = rule."jobFunctionId";

-- Recreate the timing enum without deprecated values. The merged typo is mapped
-- deterministically by column: start -> FIRST_MOVIE_END, end -> LAST_MOVIE_END.
CREATE TYPE "JobFunctionTimingAnchor_new" AS ENUM (
  'FIRST_MOVIE_START',
  'FIRST_MOVIE_END',
  'LAST_MOVIE_START',
  'LAST_MOVIE_END',
  'FIXED_TIME'
);

ALTER TABLE "JobFunctionTimingRule"
  ALTER COLUMN "startAnchor" DROP DEFAULT,
  ALTER COLUMN "endAnchor" DROP DEFAULT;

ALTER TABLE "JobFunctionTimingRule"
  ALTER COLUMN "startAnchor" TYPE "JobFunctionTimingAnchor_new"
  USING (
    CASE "startAnchor"::text
      WHEN 'DAY_PERIOD_START' THEN 'FIXED_TIME'
      WHEN 'DAY_PERIOD_END' THEN 'FIXED_TIME'
      WHEN 'FIRST_MOVIE_ENDLAST_MOVIE_END' THEN 'FIRST_MOVIE_END'
      ELSE "startAnchor"::text
    END
  )::"JobFunctionTimingAnchor_new",
  ALTER COLUMN "endAnchor" TYPE "JobFunctionTimingAnchor_new"
  USING (
    CASE "endAnchor"::text
      WHEN 'DAY_PERIOD_START' THEN 'FIXED_TIME'
      WHEN 'DAY_PERIOD_END' THEN 'FIXED_TIME'
      WHEN 'FIRST_MOVIE_ENDLAST_MOVIE_END' THEN 'LAST_MOVIE_END'
      ELSE "endAnchor"::text
    END
  )::"JobFunctionTimingAnchor_new";

DROP TYPE "JobFunctionTimingAnchor";
ALTER TYPE "JobFunctionTimingAnchor_new" RENAME TO "JobFunctionTimingAnchor";
ALTER TABLE "JobFunctionTimingRule"
  ALTER COLUMN "startAnchor" SET DEFAULT 'FIRST_MOVIE_START',
  ALTER COLUMN "endAnchor" SET DEFAULT 'LAST_MOVIE_END';

-- Add nullable cutover columns first. They are made mandatory after deterministic backfill.
ALTER TABLE "Shift"
  ADD COLUMN "jobFunctionId" INTEGER,
  ADD COLUMN "jobFunctionNameSnapshot" TEXT,
  ADD COLUMN "jobFunctionColorSnapshot" TEXT,
  ADD COLUMN "timingSource" "ShiftTimingSource" NOT NULL DEFAULT 'MIGRATED',
  ADD COLUMN "timingRuleSnapshot" JSONB,
  ADD COLUMN "sourceMovieShowingIds" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

ALTER TABLE "StaffingRequest" ADD COLUMN "jobFunctionId" INTEGER;

-- A temporary mapping gives every legacy WorkType exactly one canonical JobFunction.
CREATE TEMP TABLE "_at3a_work_type_job_function_map" (
  "workTypeId" INTEGER PRIMARY KEY,
  "jobFunctionId" INTEGER NOT NULL
) ON COMMIT DROP;

DO $$
DECLARE
  work_type RECORD;
  matching_count INTEGER;
  mapped_job_function_id INTEGER;
  generated_base_name TEXT;
  generated_name TEXT;
  generated_name_key TEXT;
  generated_suffix INTEGER;
  generated_job_function_id INTEGER;
BEGIN
  FOR work_type IN
    SELECT * FROM "WorkType" ORDER BY "cinemaId", "id"
  LOOP
    SELECT count(*), min("id")
    INTO matching_count, mapped_job_function_id
    FROM "JobFunction"
    WHERE "workTypeId" = work_type."id"
      AND "cinemaId" = work_type."cinemaId";

    IF matching_count = 1 THEN
      UPDATE "JobFunction"
      SET "defaultPayrollExportCodeId" = COALESCE("defaultPayrollExportCodeId", work_type."payrollTypeId")
      WHERE "id" = mapped_job_function_id;
    ELSE
      IF matching_count = 0 THEN
        generated_base_name := work_type."name";
      ELSE
        generated_base_name := 'Migreret vagttype – ' || work_type."name";
      END IF;

      generated_name := generated_base_name;
      generated_suffix := 0;
      generated_name_key := lower(regexp_replace(btrim(generated_name), '\s+', ' ', 'g'));

      WHILE EXISTS (
        SELECT 1 FROM "JobFunction"
        WHERE "cinemaId" = work_type."cinemaId"
          AND "nameKey" = generated_name_key
      ) LOOP
        generated_suffix := generated_suffix + 1;
        generated_name := generated_base_name || ' (migreret ' || work_type."id" ||
          CASE WHEN generated_suffix = 1 THEN '' ELSE '-' || generated_suffix END || ')';
        generated_name_key := lower(regexp_replace(btrim(generated_name), '\s+', ' ', 'g'));
      END LOOP;

      INSERT INTO "JobFunction" (
        "cinemaId", "name", "nameKey", "description", "color", "sortOrder",
        "workTypeId", "defaultPayrollExportCodeId", "isActive", "archivedAt",
        "createdAt", "updatedAt"
      ) VALUES (
        work_type."cinemaId", generated_name, generated_name_key,
        'Automatisk oprettet ved migration fra vagttype #' || work_type."id",
        work_type."color", 0, work_type."id", work_type."payrollTypeId",
        work_type."isActive", work_type."archivedAt", now(), now()
      ) RETURNING "id" INTO generated_job_function_id;

      INSERT INTO "JobFunctionTimingRule" (
        "cinemaId", "jobFunctionId", "filmWindowStartMinute", "filmWindowEndMinute",
        "startAnchor", "startOffsetMinutes", "endAnchor", "endOffsetMinutes",
        "fallbackStartMinute", "fallbackEndMinute", "roundToQuarter",
        "limitToFilmWindow", "clampToDayPeriod", "isActive", "createdAt", "updatedAt"
      ) VALUES (
        work_type."cinemaId", generated_job_function_id, 0, 1440,
        'FIXED_TIME', 0, 'FIXED_TIME', 0, 0, 480, false,
        true, true, true, now(), now()
      );

      UPDATE "JobFunctionTimingRule"
      SET "startFixedMinute" = 0, "endFixedMinute" = 480
      WHERE "jobFunctionId" = generated_job_function_id;

      mapped_job_function_id := generated_job_function_id;
    END IF;

    INSERT INTO "_at3a_work_type_job_function_map" ("workTypeId", "jobFunctionId")
    VALUES (work_type."id", mapped_job_function_id);
  END LOOP;
END $$;

-- Existing JobFunctions without timing rules receive a neutral, explicitly reviewable rule.
INSERT INTO "JobFunctionTimingRule" (
  "cinemaId", "jobFunctionId", "filmWindowStartMinute", "filmWindowEndMinute",
  "startAnchor", "startOffsetMinutes", "startFixedMinute",
  "endAnchor", "endOffsetMinutes", "endFixedMinute",
  "fallbackStartMinute", "fallbackEndMinute", "roundToQuarter",
  "limitToFilmWindow", "clampToDayPeriod", "isActive", "createdAt", "updatedAt"
)
SELECT
  jf."cinemaId", jf."id",
  COALESCE(dp."startMinute", 0),
  CASE
    WHEN dp."startMinute" IS NULL OR dp."endMinute" IS NULL THEN 1440
    WHEN dp."endMinute" <= dp."startMinute" THEN dp."endMinute" + 1440
    ELSE dp."endMinute"
  END,
  'FIXED_TIME', 0, COALESCE(dp."startMinute", 0),
  'FIXED_TIME', 0, COALESCE(dp."endMinute", 480),
  COALESCE(dp."startMinute", 0), COALESCE(dp."endMinute", 480),
  false, true, true, true, now(), now()
FROM "JobFunction" jf
LEFT JOIN "DayPeriod" dp ON dp."id" = jf."dayPeriodId"
LEFT JOIN "JobFunctionTimingRule" rule ON rule."jobFunctionId" = jf."id"
WHERE rule."id" IS NULL;

UPDATE "JobFunction" jf
SET "defaultPayrollExportCodeId" = work_type."payrollTypeId"
FROM "WorkType" work_type
WHERE jf."workTypeId" = work_type."id"
  AND jf."defaultPayrollExportCodeId" IS NULL;

UPDATE "Shift" shift
SET
  "jobFunctionId" = mapping."jobFunctionId",
  "jobFunctionNameSnapshot" = jf."name",
  "jobFunctionColorSnapshot" = jf."color",
  "timingSource" = 'MIGRATED'
FROM "_at3a_work_type_job_function_map" mapping
JOIN "JobFunction" jf ON jf."id" = mapping."jobFunctionId"
WHERE shift."workTypeId" = mapping."workTypeId";

UPDATE "StaffingRequest" request
SET "jobFunctionId" = shift."jobFunctionId"
FROM "Shift" shift
WHERE request."shiftId" = shift."id"
  AND request."jobFunctionId" IS NULL;

UPDATE "StaffingRequest" request
SET "jobFunctionId" = mapping."jobFunctionId"
FROM "_at3a_work_type_job_function_map" mapping
WHERE request."workTypeId" = mapping."workTypeId"
  AND request."jobFunctionId" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Shift" WHERE "jobFunctionId" IS NULL) THEN
    RAISE EXCEPTION 'AT3A migration blocked: one or more shifts could not be mapped to a job function';
  END IF;
  IF EXISTS (SELECT 1 FROM "StaffingRequest" WHERE "jobFunctionId" IS NULL) THEN
    RAISE EXCEPTION 'AT3A migration blocked: one or more staffing requests could not be mapped to a job function';
  END IF;
END $$;

ALTER TABLE "Shift"
  ALTER COLUMN "jobFunctionId" SET NOT NULL,
  ALTER COLUMN "jobFunctionNameSnapshot" SET NOT NULL,
  ALTER COLUMN "jobFunctionColorSnapshot" SET NOT NULL,
  ALTER COLUMN "workTypeId" DROP NOT NULL;
ALTER TABLE "StaffingRequest" ALTER COLUMN "jobFunctionId" SET NOT NULL;

CREATE INDEX "Shift_jobFunctionId_idx" ON "Shift"("jobFunctionId");
CREATE INDEX "Shift_workTypeId_idx" ON "Shift"("workTypeId");
CREATE INDEX "StaffingRequest_jobFunctionId_idx" ON "StaffingRequest"("jobFunctionId");
ALTER TABLE "Shift"
  ADD CONSTRAINT "Shift_jobFunctionId_fkey"
  FOREIGN KEY ("jobFunctionId") REFERENCES "JobFunction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffingRequest"
  ADD CONSTRAINT "StaffingRequest_jobFunctionId_fkey"
  FOREIGN KEY ("jobFunctionId") REFERENCES "JobFunction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Versioned payroll configuration.
CREATE TABLE "PayrollConfigurationChange" (
  "id" SERIAL PRIMARY KEY,
  "cinemaId" INTEGER NOT NULL,
  "type" "PayrollConfigurationChangeType" NOT NULL,
  "membershipId" INTEGER,
  "payRuleId" INTEGER,
  "specialDayId" INTEGER,
  "validFrom" TIMESTAMP(3) NOT NULL,
  "oldValue" JSONB,
  "newValue" JSONB NOT NULL,
  "impactSummary" JSONB,
  "reason" TEXT,
  "createdByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "CinemaPayrollConfigurationVersion" (
  "id" SERIAL PRIMARY KEY,
  "cinemaId" INTEGER NOT NULL,
  "mode" "PayrollMode" NOT NULL,
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validTo" TIMESTAMP(3),
  "status" "PayrollVersionStatus" NOT NULL DEFAULT 'ACTIVE',
  "changeId" INTEGER NOT NULL,
  "createdByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" TEXT
);

CREATE TABLE "MembershipPayRateVersion" (
  "id" SERIAL PRIMARY KEY,
  "membershipId" INTEGER NOT NULL,
  "hourlyRate" DECIMAL(12,4) NOT NULL,
  "currencyCode" TEXT NOT NULL DEFAULT 'DKK',
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validTo" TIMESTAMP(3),
  "status" "PayrollVersionStatus" NOT NULL DEFAULT 'ACTIVE',
  "changeId" INTEGER NOT NULL,
  "createdByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" TEXT
);

CREATE TABLE "PayRule" (
  "id" SERIAL PRIMARY KEY,
  "cinemaId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "nameKey" TEXT NOT NULL,
  "description" TEXT,
  "ruleKind" "PayRuleKind" NOT NULL,
  "stackingMode" "PayRuleStackingMode" NOT NULL DEFAULT 'STACK',
  "exclusiveGroup" TEXT,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "payrollTypeId" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "PayRuleVersion" (
  "id" SERIAL PRIMARY KEY,
  "payRuleId" INTEGER NOT NULL,
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validTo" TIMESTAMP(3),
  "calculationType" "PayCalculationType" NOT NULL,
  "value" DECIMAL(12,4) NOT NULL,
  "windowStartMinute" INTEGER,
  "windowEndMinute" INTEGER,
  "weekdays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "specialDayType" "CinemaSpecialDayType",
  "jobFunctionId" INTEGER,
  "status" "PayrollVersionStatus" NOT NULL DEFAULT 'ACTIVE',
  "changeId" INTEGER NOT NULL,
  "createdByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" TEXT
);

CREATE TABLE "CinemaSpecialDay" (
  "id" SERIAL PRIMARY KEY,
  "cinemaId" INTEGER NOT NULL,
  "localDate" DATE NOT NULL,
  "name" TEXT NOT NULL,
  "type" "CinemaSpecialDayType" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "archivedAt" TIMESTAMP(3),
  "createdByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "PayrollCalculationRun" (
  "id" SERIAL PRIMARY KEY,
  "cinemaId" INTEGER NOT NULL,
  "payrollPeriodId" INTEGER NOT NULL,
  "payrollConfigurationVersionId" INTEGER NOT NULL,
  "status" "PayrollCalculationRunStatus" NOT NULL DEFAULT 'PREVIEW',
  "currencyCode" TEXT NOT NULL DEFAULT 'DKK',
  "totalMinutes" INTEGER NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "checksum" TEXT NOT NULL,
  "createdByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "PayrollCalculationLine" (
  "id" SERIAL PRIMARY KEY,
  "calculationRunId" INTEGER NOT NULL,
  "timeEntryId" INTEGER,
  "membershipId" INTEGER NOT NULL,
  "jobFunctionId" INTEGER,
  "payrollTypeId" INTEGER,
  "lineType" "PayrollCalculationLineType" NOT NULL,
  "segmentStart" TIMESTAMP(3) NOT NULL,
  "segmentEnd" TIMESTAMP(3) NOT NULL,
  "minutes" INTEGER NOT NULL,
  "basePayRateVersionId" INTEGER,
  "payRuleVersionId" INTEGER,
  "payrollAdjustmentId" INTEGER,
  "rate" DECIMAL(12,4),
  "percentage" DECIMAL(12,4),
  "unroundedAmount" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "roundedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "PayrollPeriod" ADD COLUMN "lockedCalculationRunId" INTEGER;
CREATE UNIQUE INDEX "PayrollPeriod_lockedCalculationRunId_key" ON "PayrollPeriod"("lockedCalculationRunId");

ALTER TABLE "PayrollAdjustment"
  ADD COLUMN "amountDelta" DECIMAL(14,2),
  ADD COLUMN "exportedAmount" DECIMAL(14,2),
  ADD COLUMN "adjustedAmount" DECIMAL(14,2),
  ADD COLUMN "currencyCode" TEXT NOT NULL DEFAULT 'DKK',
  ADD COLUMN "sourceCalculationRunId" INTEGER,
  ADD COLUMN "sourceCalculationLineId" INTEGER,
  ADD COLUMN "sourcePayRateVersionId" INTEGER,
  ADD COLUMN "sourcePayRuleVersionId" INTEGER,
  ADD COLUMN "payrollConfigurationChangeId" INTEGER;

-- Constraints and indexes for versioned payroll.
CREATE UNIQUE INDEX "CinemaPayrollConfigurationVersion_cinemaId_validFrom_key" ON "CinemaPayrollConfigurationVersion"("cinemaId", "validFrom");
CREATE INDEX "CinemaPayrollConfigurationVersion_cinemaId_validFrom_validTo_idx" ON "CinemaPayrollConfigurationVersion"("cinemaId", "validFrom", "validTo");
CREATE INDEX "CinemaPayrollConfigurationVersion_changeId_idx" ON "CinemaPayrollConfigurationVersion"("changeId");
CREATE UNIQUE INDEX "MembershipPayRateVersion_membershipId_validFrom_key" ON "MembershipPayRateVersion"("membershipId", "validFrom");
CREATE INDEX "MembershipPayRateVersion_membershipId_validFrom_validTo_idx" ON "MembershipPayRateVersion"("membershipId", "validFrom", "validTo");
CREATE INDEX "MembershipPayRateVersion_changeId_idx" ON "MembershipPayRateVersion"("changeId");
CREATE UNIQUE INDEX "PayRule_cinemaId_nameKey_key" ON "PayRule"("cinemaId", "nameKey");
CREATE INDEX "PayRule_cinemaId_isActive_idx" ON "PayRule"("cinemaId", "isActive");
CREATE INDEX "PayRule_cinemaId_ruleKind_idx" ON "PayRule"("cinemaId", "ruleKind");
CREATE INDEX "PayRule_exclusiveGroup_idx" ON "PayRule"("exclusiveGroup");
CREATE INDEX "PayRule_payrollTypeId_idx" ON "PayRule"("payrollTypeId");
CREATE UNIQUE INDEX "PayRuleVersion_payRuleId_validFrom_key" ON "PayRuleVersion"("payRuleId", "validFrom");
CREATE INDEX "PayRuleVersion_payRuleId_validFrom_validTo_idx" ON "PayRuleVersion"("payRuleId", "validFrom", "validTo");
CREATE INDEX "PayRuleVersion_jobFunctionId_idx" ON "PayRuleVersion"("jobFunctionId");
CREATE INDEX "PayRuleVersion_changeId_idx" ON "PayRuleVersion"("changeId");
CREATE UNIQUE INDEX "CinemaSpecialDay_cinemaId_localDate_type_key" ON "CinemaSpecialDay"("cinemaId", "localDate", "type");
CREATE INDEX "CinemaSpecialDay_cinemaId_localDate_isActive_idx" ON "CinemaSpecialDay"("cinemaId", "localDate", "isActive");
CREATE INDEX "PayrollConfigurationChange_cinemaId_createdAt_idx" ON "PayrollConfigurationChange"("cinemaId", "createdAt");
CREATE INDEX "PayrollConfigurationChange_membershipId_idx" ON "PayrollConfigurationChange"("membershipId");
CREATE INDEX "PayrollConfigurationChange_payRuleId_idx" ON "PayrollConfigurationChange"("payRuleId");
CREATE INDEX "PayrollConfigurationChange_specialDayId_idx" ON "PayrollConfigurationChange"("specialDayId");
CREATE INDEX "PayrollConfigurationChange_type_idx" ON "PayrollConfigurationChange"("type");
CREATE INDEX "PayrollCalculationRun_cinemaId_payrollPeriodId_idx" ON "PayrollCalculationRun"("cinemaId", "payrollPeriodId");
CREATE INDEX "PayrollCalculationRun_payrollConfigurationVersionId_idx" ON "PayrollCalculationRun"("payrollConfigurationVersionId");
CREATE INDEX "PayrollCalculationRun_status_idx" ON "PayrollCalculationRun"("status");
CREATE INDEX "PayrollCalculationLine_calculationRunId_idx" ON "PayrollCalculationLine"("calculationRunId");
CREATE INDEX "PayrollCalculationLine_timeEntryId_idx" ON "PayrollCalculationLine"("timeEntryId");
CREATE INDEX "PayrollCalculationLine_membershipId_idx" ON "PayrollCalculationLine"("membershipId");
CREATE INDEX "PayrollCalculationLine_jobFunctionId_idx" ON "PayrollCalculationLine"("jobFunctionId");
CREATE INDEX "PayrollCalculationLine_payrollTypeId_idx" ON "PayrollCalculationLine"("payrollTypeId");
CREATE INDEX "PayrollCalculationLine_basePayRateVersionId_idx" ON "PayrollCalculationLine"("basePayRateVersionId");
CREATE INDEX "PayrollCalculationLine_payRuleVersionId_idx" ON "PayrollCalculationLine"("payRuleVersionId");
CREATE INDEX "PayrollCalculationLine_payrollAdjustmentId_idx" ON "PayrollCalculationLine"("payrollAdjustmentId");
CREATE INDEX "PayrollAdjustment_sourceCalculationRunId_idx" ON "PayrollAdjustment"("sourceCalculationRunId");
CREATE INDEX "PayrollAdjustment_sourceCalculationLineId_idx" ON "PayrollAdjustment"("sourceCalculationLineId");
CREATE INDEX "PayrollAdjustment_sourcePayRateVersionId_idx" ON "PayrollAdjustment"("sourcePayRateVersionId");
CREATE INDEX "PayrollAdjustment_sourcePayRuleVersionId_idx" ON "PayrollAdjustment"("sourcePayRuleVersionId");
CREATE INDEX "PayrollAdjustment_payrollConfigurationChangeId_idx" ON "PayrollAdjustment"("payrollConfigurationChangeId");
CREATE UNIQUE INDEX "PayrollAdjustment_payrollConfigurationChangeId_timeEntryId_key" ON "PayrollAdjustment"("payrollConfigurationChangeId", "timeEntryId");

ALTER TABLE "PayrollConfigurationChange" ADD CONSTRAINT "PayrollConfigurationChange_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollConfigurationChange" ADD CONSTRAINT "PayrollConfigurationChange_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "UserCinemaMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollConfigurationChange" ADD CONSTRAINT "PayrollConfigurationChange_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CinemaPayrollConfigurationVersion" ADD CONSTRAINT "CinemaPayrollConfigurationVersion_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CinemaPayrollConfigurationVersion" ADD CONSTRAINT "CinemaPayrollConfigurationVersion_changeId_fkey" FOREIGN KEY ("changeId") REFERENCES "PayrollConfigurationChange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CinemaPayrollConfigurationVersion" ADD CONSTRAINT "CinemaPayrollConfigurationVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MembershipPayRateVersion" ADD CONSTRAINT "MembershipPayRateVersion_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "UserCinemaMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MembershipPayRateVersion" ADD CONSTRAINT "MembershipPayRateVersion_changeId_fkey" FOREIGN KEY ("changeId") REFERENCES "PayrollConfigurationChange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MembershipPayRateVersion" ADD CONSTRAINT "MembershipPayRateVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayRule" ADD CONSTRAINT "PayRule_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayRule" ADD CONSTRAINT "PayRule_payrollTypeId_fkey" FOREIGN KEY ("payrollTypeId") REFERENCES "PayrollType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollConfigurationChange" ADD CONSTRAINT "PayrollConfigurationChange_payRuleId_fkey" FOREIGN KEY ("payRuleId") REFERENCES "PayRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayRuleVersion" ADD CONSTRAINT "PayRuleVersion_payRuleId_fkey" FOREIGN KEY ("payRuleId") REFERENCES "PayRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayRuleVersion" ADD CONSTRAINT "PayRuleVersion_jobFunctionId_fkey" FOREIGN KEY ("jobFunctionId") REFERENCES "JobFunction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayRuleVersion" ADD CONSTRAINT "PayRuleVersion_changeId_fkey" FOREIGN KEY ("changeId") REFERENCES "PayrollConfigurationChange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayRuleVersion" ADD CONSTRAINT "PayRuleVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CinemaSpecialDay" ADD CONSTRAINT "CinemaSpecialDay_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CinemaSpecialDay" ADD CONSTRAINT "CinemaSpecialDay_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayrollConfigurationChange" ADD CONSTRAINT "PayrollConfigurationChange_specialDayId_fkey" FOREIGN KEY ("specialDayId") REFERENCES "CinemaSpecialDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollCalculationRun" ADD CONSTRAINT "PayrollCalculationRun_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollCalculationRun" ADD CONSTRAINT "PayrollCalculationRun_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollCalculationRun" ADD CONSTRAINT "PayrollCalculationRun_payrollConfigurationVersionId_fkey" FOREIGN KEY ("payrollConfigurationVersionId") REFERENCES "CinemaPayrollConfigurationVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollCalculationRun" ADD CONSTRAINT "PayrollCalculationRun_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_lockedCalculationRunId_fkey" FOREIGN KEY ("lockedCalculationRunId") REFERENCES "PayrollCalculationRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollCalculationLine" ADD CONSTRAINT "PayrollCalculationLine_calculationRunId_fkey" FOREIGN KEY ("calculationRunId") REFERENCES "PayrollCalculationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollCalculationLine" ADD CONSTRAINT "PayrollCalculationLine_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "TimeEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollCalculationLine" ADD CONSTRAINT "PayrollCalculationLine_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "UserCinemaMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollCalculationLine" ADD CONSTRAINT "PayrollCalculationLine_jobFunctionId_fkey" FOREIGN KEY ("jobFunctionId") REFERENCES "JobFunction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollCalculationLine" ADD CONSTRAINT "PayrollCalculationLine_payrollTypeId_fkey" FOREIGN KEY ("payrollTypeId") REFERENCES "PayrollType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollCalculationLine" ADD CONSTRAINT "PayrollCalculationLine_basePayRateVersionId_fkey" FOREIGN KEY ("basePayRateVersionId") REFERENCES "MembershipPayRateVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollCalculationLine" ADD CONSTRAINT "PayrollCalculationLine_payRuleVersionId_fkey" FOREIGN KEY ("payRuleVersionId") REFERENCES "PayRuleVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollCalculationLine" ADD CONSTRAINT "PayrollCalculationLine_payrollAdjustmentId_fkey" FOREIGN KEY ("payrollAdjustmentId") REFERENCES "PayrollAdjustment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_sourceCalculationRunId_fkey" FOREIGN KEY ("sourceCalculationRunId") REFERENCES "PayrollCalculationRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_sourceCalculationLineId_fkey" FOREIGN KEY ("sourceCalculationLineId") REFERENCES "PayrollCalculationLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_sourcePayRateVersionId_fkey" FOREIGN KEY ("sourcePayRateVersionId") REFERENCES "MembershipPayRateVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_sourcePayRuleVersionId_fkey" FOREIGN KEY ("sourcePayRuleVersionId") REFERENCES "PayRuleVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_payrollConfigurationChangeId_fkey" FOREIGN KEY ("payrollConfigurationChangeId") REFERENCES "PayrollConfigurationChange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StaffingAiProfile" RENAME COLUMN "preferredWorkTypes" TO "preferredJobFunctions";

-- Every existing cinema starts conservatively in HOURS_ONLY.
DO $$
DECLARE
  cinema_row RECORD;
  change_id INTEGER;
BEGIN
  FOR cinema_row IN SELECT "id", "createdAt" FROM "Cinema" ORDER BY "id"
  LOOP
    INSERT INTO "PayrollConfigurationChange" (
      "cinemaId", "type", "validFrom", "newValue", "reason", "createdAt"
    ) VALUES (
      cinema_row."id", 'PAYROLL_MODE', cinema_row."createdAt",
      jsonb_build_object('mode', 'HOURS_ONLY'),
      'Migreret konservativt til Kun timer i AT3A-001', now()
    ) RETURNING "id" INTO change_id;

    INSERT INTO "CinemaPayrollConfigurationVersion" (
      "cinemaId", "mode", "validFrom", "validTo", "status", "changeId", "reason", "createdAt"
    ) VALUES (
      cinema_row."id", 'HOURS_ONLY', cinema_row."createdAt", NULL,
      'ACTIVE', change_id, 'Migreret konservativt til Kun timer i AT3A-001', now()
    );
  END LOOP;
END $$;

-- Legacy locked/exported periods receive immutable HOURS_ONLY snapshots. Monetary amounts stay zero.
DO $$
DECLARE
  period_row RECORD;
  configuration_version_id INTEGER;
  calculation_run_id INTEGER;
  missing_memberships INTEGER;
BEGIN
  SELECT count(*) INTO missing_memberships
  FROM "TimeEntry" entry
  JOIN "PayrollPeriod" period ON period."id" = entry."payrollPeriodId"
  LEFT JOIN "UserCinemaMembership" membership
    ON membership."userId" = entry."userId" AND membership."cinemaId" = entry."cinemaId"
  WHERE period."status" IN ('LOCKED', 'EXPORTED')
    AND membership."id" IS NULL;

  IF missing_memberships > 0 THEN
    RAISE EXCEPTION 'AT3A migration blocked: locked/exported time entries without cinema membership: %', missing_memberships;
  END IF;

  FOR period_row IN
    SELECT * FROM "PayrollPeriod" WHERE "status" IN ('LOCKED', 'EXPORTED') ORDER BY "id"
  LOOP
    SELECT "id" INTO configuration_version_id
    FROM "CinemaPayrollConfigurationVersion"
    WHERE "cinemaId" = period_row."cinemaId"
      AND "validFrom" <= period_row."startDate"
      AND ("validTo" IS NULL OR "validTo" > period_row."startDate")
    ORDER BY "validFrom" DESC
    LIMIT 1;

    INSERT INTO "PayrollCalculationRun" (
      "cinemaId", "payrollPeriodId", "payrollConfigurationVersionId", "status",
      "currencyCode", "totalMinutes", "totalAmount", "checksum", "createdAt"
    )
    SELECT
      period_row."cinemaId", period_row."id", configuration_version_id, 'LOCKED',
      'DKK',
      COALESCE(sum(round(extract(epoch FROM (entry."clockOut" - entry."clockIn")) / 60.0))::integer, 0),
      0,
      'legacy-hours-only:' || period_row."id"::text,
      COALESCE(period_row."lockedAt", period_row."updatedAt", now())
    FROM "TimeEntry" entry
    WHERE entry."payrollPeriodId" = period_row."id"
      AND entry."clockOut" IS NOT NULL
      AND entry."status" = 'APPROVED'
    RETURNING "id" INTO calculation_run_id;

    INSERT INTO "PayrollCalculationLine" (
      "calculationRunId", "timeEntryId", "membershipId", "jobFunctionId", "payrollTypeId",
      "lineType", "segmentStart", "segmentEnd", "minutes", "unroundedAmount",
      "roundedAmount", "metadata", "createdAt"
    )
    SELECT
      calculation_run_id, entry."id", membership."id", shift."jobFunctionId", entry."payrollTypeId",
      'HOURS', entry."clockIn", entry."clockOut",
      round(extract(epoch FROM (entry."clockOut" - entry."clockIn")) / 60.0)::integer,
      0, 0, jsonb_build_object('legacy', true, 'mode', 'HOURS_ONLY'),
      COALESCE(period_row."lockedAt", period_row."updatedAt", now())
    FROM "TimeEntry" entry
    JOIN "UserCinemaMembership" membership
      ON membership."userId" = entry."userId" AND membership."cinemaId" = entry."cinemaId"
    LEFT JOIN "Shift" shift ON shift."id" = entry."shiftId"
    WHERE entry."payrollPeriodId" = period_row."id"
      AND entry."clockOut" IS NOT NULL
      AND entry."status" = 'APPROVED';

    UPDATE "PayrollPeriod"
    SET "lockedCalculationRunId" = calculation_run_id
    WHERE "id" = period_row."id";
  END LOOP;
END $$;
