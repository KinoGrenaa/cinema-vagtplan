-- CreateEnum
CREATE TYPE "CinemaRole" AS ENUM ('ADMIN', 'EMPLOYEE');

-- Expand UserCinemaMembership with cinema-scoped role, employment and permissions.
ALTER TABLE "UserCinemaMembership"
ADD COLUMN "role" "CinemaRole" NOT NULL DEFAULT 'EMPLOYEE',
ADD COLUMN "deactivatedAt" TIMESTAMP(3),
ADD COLUMN "employmentType" "EmploymentType" NOT NULL DEFAULT 'HOURLY',
ADD COLUMN "hireDate" TIMESTAMP(3),
ADD COLUMN "employeeNumber" TEXT,
ADD COLUMN "payrollEmployeeId" TEXT,
ADD COLUMN "canManageSchedule" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "canManageUsers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "canManagePayroll" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "canManageLeaveRequests" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "canManageCinemaSettings" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "canSendBroadcastMessages" BOOLEAN NOT NULL DEFAULT false;

-- Backfill every existing cinema membership from the current global user fields.
-- MASTER is intentionally not a cinema role; any unexpected MASTER membership
-- is migrated as EMPLOYEE and can be reviewed before the old global fields are removed.
UPDATE "UserCinemaMembership" AS membership
SET
  "role" = CASE
    WHEN app_user."role" = 'ADMIN'::"Role"
      THEN 'ADMIN'::"CinemaRole"
    ELSE 'EMPLOYEE'::"CinemaRole"
  END,
  "employmentType" = app_user."employmentType",
  "hireDate" = app_user."hireDate",
  "employeeNumber" = app_user."employeeNumber",
  "payrollEmployeeId" = app_user."payrollEmployeeId",
  "canManageSchedule" = app_user."canManageSchedule",
  "canManageUsers" = app_user."canManageUsers",
  "canManagePayroll" = app_user."canManagePayroll",
  "canManageLeaveRequests" = app_user."canManageLeaveRequests",
  "canManageCinemaSettings" = app_user."canManageCinemaSettings",
  "canSendBroadcastMessages" = app_user."canSendBroadcastMessages",
  "deactivatedAt" = CASE
    WHEN membership."isActive" = false
      AND app_user."isActive" = false
      THEN app_user."deactivatedAt"
    ELSE membership."deactivatedAt"
  END
FROM "User" AS app_user
WHERE app_user."id" = membership."userId";

-- AddIndex
CREATE INDEX "UserCinemaMembership_cinemaId_isActive_role_idx"
ON "UserCinemaMembership"("cinemaId", "isActive", "role");
