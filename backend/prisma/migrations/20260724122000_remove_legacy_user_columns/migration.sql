-- The cinema-specific values were backfilled to UserCinemaMembership
-- in 20260724090000_expand_user_cinema_memberships. Production code no
-- longer reads or writes the legacy User columns.

-- Abort rather than silently discard legacy-only ordinary-user data if an
-- unexpected account escaped the membership backfill.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "User" AS app_user
    WHERE
      app_user."role" <> 'MASTER'::"Role"
      AND NOT EXISTS (
        SELECT 1
        FROM "UserCinemaMembership" AS membership
        WHERE membership."userId" = app_user."id"
      )
      AND (
        app_user."cinemaId" IS NOT NULL
        OR app_user."hireDate" IS NOT NULL
        OR app_user."employeeNumber" IS NOT NULL
        OR app_user."payrollEmployeeId" IS NOT NULL
        OR app_user."employmentType" <> 'HOURLY'::"EmploymentType"
        OR app_user."canManageSchedule" = true
        OR app_user."canManageUsers" = true
        OR app_user."canManagePayroll" = true
        OR app_user."canManageLeaveRequests" = true
        OR app_user."canManageCinemaSettings" = true
        OR app_user."canSendBroadcastMessages" = true
      )
  ) THEN
    RAISE EXCEPTION
      'Legacy User data exists without a cinema membership; migration stopped to avoid data loss';
  END IF;
END
$$;

-- Keep defaultCinemaId valid for ordinary accounts. If the previous default
-- is inactive or missing, choose the first active membership; otherwise null.
WITH resolved_defaults AS (
  SELECT
    app_user."id" AS "userId",
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM "UserCinemaMembership" AS current_membership
        WHERE
          current_membership."userId" = app_user."id"
          AND current_membership."cinemaId" = app_user."defaultCinemaId"
          AND current_membership."isActive" = true
      )
      THEN app_user."defaultCinemaId"
      ELSE (
        SELECT fallback_membership."cinemaId"
        FROM "UserCinemaMembership" AS fallback_membership
        WHERE
          fallback_membership."userId" = app_user."id"
          AND fallback_membership."isActive" = true
        ORDER BY fallback_membership."cinemaId" ASC
        LIMIT 1
      )
    END AS "nextDefaultCinemaId"
  FROM "User" AS app_user
  WHERE app_user."role" <> 'MASTER'::"Role"
)
UPDATE "User" AS app_user
SET "defaultCinemaId" = resolved_defaults."nextDefaultCinemaId"
FROM resolved_defaults
WHERE
  app_user."id" = resolved_defaults."userId"
  AND app_user."defaultCinemaId"
      IS DISTINCT FROM resolved_defaults."nextDefaultCinemaId";

ALTER TABLE "User"
  DROP CONSTRAINT IF EXISTS "User_cinemaId_fkey";

DROP INDEX IF EXISTS "User_cinemaId_idx";

ALTER TABLE "User"
  DROP COLUMN IF EXISTS "cinemaId",
  DROP COLUMN IF EXISTS "hireDate",
  DROP COLUMN IF EXISTS "employeeNumber",
  DROP COLUMN IF EXISTS "payrollEmployeeId",
  DROP COLUMN IF EXISTS "employmentType",
  DROP COLUMN IF EXISTS "canManageSchedule",
  DROP COLUMN IF EXISTS "canManageUsers",
  DROP COLUMN IF EXISTS "canManagePayroll",
  DROP COLUMN IF EXISTS "canManageLeaveRequests",
  DROP COLUMN IF EXISTS "canManageCinemaSettings",
  DROP COLUMN IF EXISTS "canSendBroadcastMessages";
