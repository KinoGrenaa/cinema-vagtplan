-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('HOURLY', 'SALARIED');

-- CreateEnum
CREATE TYPE "ShiftTradeType" AS ENUM ('POOL', 'DIRECT');

-- CreateEnum
CREATE TYPE "TimeEntryStatus" AS ENUM ('PENDING', 'NEEDS_CHANGES', 'APPROVED', 'VOIDED');

-- CreateEnum
CREATE TYPE "PayrollPeriodStatus" AS ENUM ('OPEN', 'LOCKED', 'EXPORTED', 'UNLOCKED');

-- CreateEnum
CREATE TYPE "PayrollPeriodModel" AS ENUM ('CALENDAR_MONTH', 'FIXED_DAY_TO_DAY', 'BIWEEKLY');

-- CreateEnum
CREATE TYPE "PayrollPayoutRule" AS ENUM ('LAST_WEEKDAY_OF_MONTH', 'FIXED_DAY_OF_MONTH');

-- CreateEnum
CREATE TYPE "PayrollAdjustmentType" AS ENUM ('APPROVAL_AFTER_EXPORT', 'EDIT_AFTER_EXPORT', 'MANUAL_ENTRY_IN_EXPORTED_PERIOD');

-- CreateEnum
CREATE TYPE "PayrollAdjustmentStatus" AS ENUM ('PENDING', 'INCLUDED', 'VOIDED');

-- CreateEnum
CREATE TYPE "PayrollAdjustmentExportCategory" AS ENUM ('HOURLY', 'SALARIED', 'VOLUNTEER');

-- CreateEnum
CREATE TYPE "PayrollAdjustmentRevisionAction" AS ENUM ('CREATED', 'UPDATED', 'INCLUDED', 'VOIDED');

-- CreateEnum
CREATE TYPE "StaffingRequestType" AS ENUM ('EXTRA_SHIFT', 'EMERGENCY', 'REPLACEMENT', 'OVERTIME');

-- CreateEnum
CREATE TYPE "StaffingRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "LeaveStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
ALTER TYPE "ShiftTradeStatus" ADD VALUE 'REJECTED';

-- DropForeignKey
ALTER TABLE "Shift" DROP CONSTRAINT "Shift_userId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_cinemaId_fkey";

-- AlterTable
ALTER TABLE "Cinema" ADD COLUMN     "aiEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowShiftTradeDirect" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowShiftTradePool" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "clockInDeviationToleranceMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "clockOutDeviationToleranceMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "dailyOvertimeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dailyOvertimeThreshold" DOUBLE PRECISION NOT NULL DEFAULT 8,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "payrollOvertimeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payrollPayoutDay" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "payrollPayoutRule" "PayrollPayoutRule" NOT NULL DEFAULT 'LAST_WEEKDAY_OF_MONTH',
ADD COLUMN     "payrollPeriodAnchorDate" TIMESTAMP(3),
ADD COLUMN     "payrollPeriodEndDay" INTEGER NOT NULL DEFAULT 31,
ADD COLUMN     "payrollPeriodModel" "PayrollPeriodModel" NOT NULL DEFAULT 'CALENDAR_MONTH',
ADD COLUMN     "payrollPeriodStartDay" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "payrollRulesEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "plannedOvertimeEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requireNoteForClockInDeviation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requireNoteForClockOutDeviation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requireNoteForManualEntry" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "weeklyOvertimeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "weeklyOvertimeThreshold" DOUBLE PRECISION NOT NULL DEFAULT 37;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "isRead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recalledAt" TIMESTAMP(3),
ADD COLUMN     "recalledByUserId" INTEGER,
ADD COLUMN     "relatedShiftTradeId" INTEGER,
ADD COLUMN     "systemType" TEXT;

-- AlterTable
ALTER TABLE "PushSubscription" ADD COLUMN     "cinemaId" INTEGER;

-- Existing push subscriptions are browser/device registrations and can be recreated.
-- Backfill cinemaId from the owning user where possible, then remove rows that cannot be scoped.
UPDATE "PushSubscription" AS ps
SET "cinemaId" = u."cinemaId"
FROM "User" AS u
WHERE ps."userId" = u."id"
  AND ps."cinemaId" IS NULL;

DELETE FROM "PushSubscription"
WHERE "cinemaId" IS NULL;

ALTER TABLE "PushSubscription" ALTER COLUMN "cinemaId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Shift" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ShiftTrade" ADD COLUMN     "rejectedByUserId" INTEGER,
ADD COLUMN     "targetUserId" INTEGER,
ADD COLUMN     "type" "ShiftTradeType" NOT NULL DEFAULT 'POOL';

-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "adjustmentPayrollPeriodId" INTEGER,
ADD COLUMN     "adminNote" TEXT,
ADD COLUMN     "clockInNote" TEXT,
ADD COLUMN     "clockOutNote" TEXT,
ADD COLUMN     "isPayrollAdjustment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "originalPayrollPeriodId" INTEGER,
ADD COLUMN     "payrollAdjustmentReason" TEXT,
ADD COLUMN     "payrollLockNote" TEXT,
ADD COLUMN     "payrollLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payrollPeriodId" INTEGER,
ADD COLUMN     "payrollTypeId" INTEGER,
ADD COLUMN     "payrollUnlockedAt" TIMESTAMP(3),
ADD COLUMN     "payrollUnlockedByMaster" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "TimeEntryStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "canManageCinemaSettings" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageLeaveRequests" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManagePayroll" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageSchedule" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageUsers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canSendBroadcastMessages" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "employeeNumber" TEXT,
ADD COLUMN     "employmentType" "EmploymentType" NOT NULL DEFAULT 'HOURLY',
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "payrollEmployeeId" TEXT,
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'light',
ALTER COLUMN "cinemaId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "WorkType" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "payrollTypeId" INTEGER;

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "linkUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "cinemaId" INTEGER NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER,
    "cinemaId" INTEGER,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollPeriod" (
    "id" SERIAL NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "PayrollPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "lockedAt" TIMESTAMP(3),
    "lockedByUserId" INTEGER,
    "exportedAt" TIMESTAMP(3),
    "exportedByUserId" INTEGER,
    "unlockedAt" TIMESTAMP(3),
    "unlockedByUserId" INTEGER,
    "unlockNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollType" (
    "id" SERIAL NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "payrollCode" TEXT NOT NULL,
    "exportCode" TEXT,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollAdjustment" (
    "id" SERIAL NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "timeEntryId" INTEGER NOT NULL,
    "originalPayrollPeriodId" INTEGER NOT NULL,
    "settlementPayrollPeriodId" INTEGER,
    "payrollTypeId" INTEGER,
    "type" "PayrollAdjustmentType" NOT NULL,
    "status" "PayrollAdjustmentStatus" NOT NULL DEFAULT 'PENDING',
    "exportCategory" "PayrollAdjustmentExportCategory" NOT NULL DEFAULT 'HOURLY',
    "minutesDelta" INTEGER NOT NULL,
    "exportedMinutes" INTEGER NOT NULL,
    "adjustedMinutes" INTEGER NOT NULL,
    "previousMinutes" INTEGER,
    "newMinutes" INTEGER,
    "previousClockIn" TIMESTAMP(3),
    "previousClockOut" TIMESTAMP(3),
    "newClockIn" TIMESTAMP(3),
    "newClockOut" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "createdByUserId" INTEGER,
    "includedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollAdjustmentRevision" (
    "id" SERIAL NOT NULL,
    "payrollAdjustmentId" INTEGER NOT NULL,
    "changedByUserId" INTEGER,
    "action" "PayrollAdjustmentRevisionAction" NOT NULL,
    "previousStatus" "PayrollAdjustmentStatus",
    "newStatus" "PayrollAdjustmentStatus",
    "previousExportedMinutes" INTEGER,
    "newExportedMinutes" INTEGER,
    "previousAdjustedMinutes" INTEGER,
    "newAdjustedMinutes" INTEGER,
    "previousMinutesDelta" INTEGER,
    "newMinutesDelta" INTEGER,
    "previousOriginalPayrollPeriodId" INTEGER,
    "newOriginalPayrollPeriodId" INTEGER,
    "previousSettlementPayrollPeriodId" INTEGER,
    "newSettlementPayrollPeriodId" INTEGER,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollAdjustmentRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiLearningEvent" (
    "id" SERIAL NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiLearningEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffingRequest" (
    "id" SERIAL NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "shiftId" INTEGER,
    "requestStartTime" TIMESTAMP(3),
    "requestEndTime" TIMESTAMP(3),
    "workTypeId" INTEGER,
    "requestedByUserId" INTEGER NOT NULL,
    "targetUserId" INTEGER,
    "type" "StaffingRequestType" NOT NULL,
    "status" "StaffingRequestStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "message" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffingAiProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "acceptanceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rejectionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "emergencyAcceptanceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fatigueScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtimeScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aiPriorityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "preferredHours" TEXT,
    "preferredWorkTypes" TEXT,
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "acceptedRequests" INTEGER NOT NULL DEFAULT 0,
    "rejectedRequests" INTEGER NOT NULL DEFAULT 0,
    "lastAcceptedAt" TIMESTAMP(3),
    "lastRejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffingAiProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntryRevision" (
    "id" SERIAL NOT NULL,
    "timeEntryId" INTEGER NOT NULL,
    "changedByUserId" INTEGER,
    "action" TEXT NOT NULL,
    "previousStatus" "TimeEntryStatus",
    "newStatus" "TimeEntryStatus",
    "previousClockIn" TIMESTAMP(3),
    "newClockIn" TIMESTAMP(3),
    "previousClockOut" TIMESTAMP(3),
    "newClockOut" TIMESTAMP(3),
    "previousNote" TEXT,
    "newNote" TEXT,
    "previousClockInNote" TEXT,
    "newClockInNote" TEXT,
    "previousClockOutNote" TEXT,
    "newClockOutNote" TEXT,
    "previousAdminNote" TEXT,
    "newAdminNote" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeEntryRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayrollPeriod_cinemaId_idx" ON "PayrollPeriod"("cinemaId");

-- CreateIndex
CREATE INDEX "PayrollPeriod_startDate_endDate_idx" ON "PayrollPeriod"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "PayrollPeriod_status_idx" ON "PayrollPeriod"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollPeriod_cinemaId_startDate_endDate_key" ON "PayrollPeriod"("cinemaId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "PayrollType_cinemaId_idx" ON "PayrollType"("cinemaId");

-- CreateIndex
CREATE INDEX "PayrollType_payrollCode_idx" ON "PayrollType"("payrollCode");

-- CreateIndex
CREATE INDEX "PayrollAdjustment_cinemaId_idx" ON "PayrollAdjustment"("cinemaId");

-- CreateIndex
CREATE INDEX "PayrollAdjustment_userId_idx" ON "PayrollAdjustment"("userId");

-- CreateIndex
CREATE INDEX "PayrollAdjustment_timeEntryId_idx" ON "PayrollAdjustment"("timeEntryId");

-- CreateIndex
CREATE INDEX "PayrollAdjustment_originalPayrollPeriodId_idx" ON "PayrollAdjustment"("originalPayrollPeriodId");

-- CreateIndex
CREATE INDEX "PayrollAdjustment_settlementPayrollPeriodId_idx" ON "PayrollAdjustment"("settlementPayrollPeriodId");

-- CreateIndex
CREATE INDEX "PayrollAdjustment_payrollTypeId_idx" ON "PayrollAdjustment"("payrollTypeId");

-- CreateIndex
CREATE INDEX "PayrollAdjustment_status_idx" ON "PayrollAdjustment"("status");

-- CreateIndex
CREATE INDEX "PayrollAdjustment_type_idx" ON "PayrollAdjustment"("type");

-- CreateIndex
CREATE INDEX "PayrollAdjustment_exportCategory_idx" ON "PayrollAdjustment"("exportCategory");

-- CreateIndex
CREATE INDEX "PayrollAdjustmentRevision_payrollAdjustmentId_idx" ON "PayrollAdjustmentRevision"("payrollAdjustmentId");

-- CreateIndex
CREATE INDEX "PayrollAdjustmentRevision_changedByUserId_idx" ON "PayrollAdjustmentRevision"("changedByUserId");

-- CreateIndex
CREATE INDEX "PayrollAdjustmentRevision_createdAt_idx" ON "PayrollAdjustmentRevision"("createdAt");

-- CreateIndex
CREATE INDEX "AiLearningEvent_cinemaId_idx" ON "AiLearningEvent"("cinemaId");

-- CreateIndex
CREATE INDEX "AiLearningEvent_type_idx" ON "AiLearningEvent"("type");

-- CreateIndex
CREATE INDEX "AiLearningEvent_createdAt_idx" ON "AiLearningEvent"("createdAt");

-- CreateIndex
CREATE INDEX "StaffingRequest_cinemaId_idx" ON "StaffingRequest"("cinemaId");

-- CreateIndex
CREATE INDEX "StaffingRequest_shiftId_idx" ON "StaffingRequest"("shiftId");

-- CreateIndex
CREATE INDEX "StaffingRequest_workTypeId_idx" ON "StaffingRequest"("workTypeId");

-- CreateIndex
CREATE INDEX "StaffingRequest_requestStartTime_idx" ON "StaffingRequest"("requestStartTime");

-- CreateIndex
CREATE INDEX "StaffingRequest_requestedByUserId_idx" ON "StaffingRequest"("requestedByUserId");

-- CreateIndex
CREATE INDEX "StaffingRequest_targetUserId_idx" ON "StaffingRequest"("targetUserId");

-- CreateIndex
CREATE INDEX "StaffingRequest_status_idx" ON "StaffingRequest"("status");

-- CreateIndex
CREATE INDEX "StaffingRequest_type_idx" ON "StaffingRequest"("type");

-- CreateIndex
CREATE INDEX "StaffingRequest_createdAt_idx" ON "StaffingRequest"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StaffingAiProfile_userId_key" ON "StaffingAiProfile"("userId");

-- CreateIndex
CREATE INDEX "StaffingAiProfile_aiPriorityScore_idx" ON "StaffingAiProfile"("aiPriorityScore");

-- CreateIndex
CREATE INDEX "StaffingAiProfile_fatigueScore_idx" ON "StaffingAiProfile"("fatigueScore");

-- CreateIndex
CREATE INDEX "StaffingAiProfile_overtimeScore_idx" ON "StaffingAiProfile"("overtimeScore");

-- CreateIndex
CREATE INDEX "TimeEntryRevision_timeEntryId_idx" ON "TimeEntryRevision"("timeEntryId");

-- CreateIndex
CREATE INDEX "TimeEntryRevision_changedByUserId_idx" ON "TimeEntryRevision"("changedByUserId");

-- CreateIndex
CREATE INDEX "TimeEntryRevision_createdAt_idx" ON "TimeEntryRevision"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkType" ADD CONSTRAINT "WorkType_payrollTypeId_fkey" FOREIGN KEY ("payrollTypeId") REFERENCES "PayrollType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftTrade" ADD CONSTRAINT "ShiftTrade_rejectedByUserId_fkey" FOREIGN KEY ("rejectedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftTrade" ADD CONSTRAINT "ShiftTrade_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_originalPayrollPeriodId_fkey" FOREIGN KEY ("originalPayrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_adjustmentPayrollPeriodId_fkey" FOREIGN KEY ("adjustmentPayrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_payrollTypeId_fkey" FOREIGN KEY ("payrollTypeId") REFERENCES "PayrollType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollType" ADD CONSTRAINT "PayrollType_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "TimeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_originalPayrollPeriodId_fkey" FOREIGN KEY ("originalPayrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_settlementPayrollPeriodId_fkey" FOREIGN KEY ("settlementPayrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_payrollTypeId_fkey" FOREIGN KEY ("payrollTypeId") REFERENCES "PayrollType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAdjustmentRevision" ADD CONSTRAINT "PayrollAdjustmentRevision_payrollAdjustmentId_fkey" FOREIGN KEY ("payrollAdjustmentId") REFERENCES "PayrollAdjustment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAdjustmentRevision" ADD CONSTRAINT "PayrollAdjustmentRevision_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiLearningEvent" ADD CONSTRAINT "AiLearningEvent_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffingRequest" ADD CONSTRAINT "StaffingRequest_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffingRequest" ADD CONSTRAINT "StaffingRequest_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffingRequest" ADD CONSTRAINT "StaffingRequest_workTypeId_fkey" FOREIGN KEY ("workTypeId") REFERENCES "WorkType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffingRequest" ADD CONSTRAINT "StaffingRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffingRequest" ADD CONSTRAINT "StaffingRequest_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffingAiProfile" ADD CONSTRAINT "StaffingAiProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntryRevision" ADD CONSTRAINT "TimeEntryRevision_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "TimeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntryRevision" ADD CONSTRAINT "TimeEntryRevision_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

