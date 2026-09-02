-- Make staffing-load warnings cinema-specific and persist ignore/reopen decisions.
ALTER TABLE "Cinema"
ADD COLUMN "staffingLoadWarningEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "staffingLoadWarningMinSoldSeats" INTEGER NOT NULL DEFAULT 150,
ADD COLUMN "staffingLoadWarningMaxTicketsPerEmployee" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN "staffingLoadWarningVersion" INTEGER NOT NULL DEFAULT 1;

CREATE TYPE "DashboardWarningType" AS ENUM ('UNASSIGNED_SHIFT', 'STAFFING_LOAD');
CREATE TYPE "DashboardWarningDecisionAction" AS ENUM ('IGNORED', 'REOPENED');

CREATE TABLE "DashboardWarningDecision" (
  "id" SERIAL NOT NULL,
  "cinemaId" INTEGER NOT NULL,
  "warningKey" TEXT NOT NULL,
  "warningType" "DashboardWarningType" NOT NULL,
  "localDate" TEXT NOT NULL,
  "action" "DashboardWarningDecisionAction" NOT NULL,
  "note" TEXT,
  "warningLabel" TEXT NOT NULL,
  "warningDetails" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" INTEGER NOT NULL,
  CONSTRAINT "DashboardWarningDecision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DashboardWarningDecision_cinemaId_localDate_createdAt_id_idx"
ON "DashboardWarningDecision"("cinemaId", "localDate", "createdAt", "id");

CREATE INDEX "DashboardWarningDecision_cinemaId_warningKey_createdAt_id_idx"
ON "DashboardWarningDecision"("cinemaId", "warningKey", "createdAt", "id");

ALTER TABLE "DashboardWarningDecision"
ADD CONSTRAINT "DashboardWarningDecision_cinemaId_fkey"
FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DashboardWarningDecision"
ADD CONSTRAINT "DashboardWarningDecision_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
