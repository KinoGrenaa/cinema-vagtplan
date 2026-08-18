ALTER TABLE "Cinema"
ADD COLUMN "automaticTimeRegistrationEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "automaticTimeRegistrationMethod" TEXT NOT NULL DEFAULT 'PLANNED_SHIFT',
ADD COLUMN "automaticTimeRegistrationMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "automaticTimeRegistrationActiveFrom" TIMESTAMP(3);

ALTER TABLE "TimeEntry"
ADD COLUMN "automaticClockIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "automaticClockOut" BOOLEAN NOT NULL DEFAULT false;
