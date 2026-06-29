-- CreateEnum
CREATE TYPE "JobFunctionTimingAnchor" AS ENUM ('DAY_PERIOD_START', 'DAY_PERIOD_END', 'FIRST_MOVIE_START', 'LAST_MOVIE_END', 'FIXED_TIME');

-- CreateTable
CREATE TABLE "JobFunctionTimingRule" (
    "id" SERIAL NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "jobFunctionId" INTEGER NOT NULL,
    "startAnchor" "JobFunctionTimingAnchor" NOT NULL DEFAULT 'DAY_PERIOD_START',
    "startOffsetMinutes" INTEGER NOT NULL DEFAULT 0,
    "startFixedMinute" INTEGER,
    "endAnchor" "JobFunctionTimingAnchor" NOT NULL DEFAULT 'DAY_PERIOD_END',
    "endOffsetMinutes" INTEGER NOT NULL DEFAULT 0,
    "endFixedMinute" INTEGER,
    "fallbackStartMinute" INTEGER,
    "fallbackEndMinute" INTEGER,
    "clampToDayPeriod" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobFunctionTimingRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobFunctionTimingRule_jobFunctionId_key" ON "JobFunctionTimingRule"("jobFunctionId");

-- CreateIndex
CREATE INDEX "JobFunctionTimingRule_cinemaId_idx" ON "JobFunctionTimingRule"("cinemaId");

-- CreateIndex
CREATE INDEX "JobFunctionTimingRule_jobFunctionId_idx" ON "JobFunctionTimingRule"("jobFunctionId");

-- CreateIndex
CREATE INDEX "JobFunctionTimingRule_isActive_idx" ON "JobFunctionTimingRule"("isActive");

-- AddForeignKey
ALTER TABLE "JobFunctionTimingRule" ADD CONSTRAINT "JobFunctionTimingRule_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobFunctionTimingRule" ADD CONSTRAINT "JobFunctionTimingRule_jobFunctionId_fkey" FOREIGN KEY ("jobFunctionId") REFERENCES "JobFunction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
