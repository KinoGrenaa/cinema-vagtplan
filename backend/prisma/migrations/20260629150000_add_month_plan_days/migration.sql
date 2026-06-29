-- CreateTable
CREATE TABLE "MonthPlanDay" (
    "id" SERIAL NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "scheduleTemplateId" INTEGER,
    "note" TEXT,
    "movieProgramFirstStart" TIMESTAMP(3),
    "movieProgramLastEnd" TIMESTAMP(3),
    "movieShowingCount" INTEGER NOT NULL DEFAULT 0,
    "plannedShiftCount" INTEGER NOT NULL DEFAULT 0,
    "unassignedShiftCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthPlanDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthPlanDay_cinemaId_date_key" ON "MonthPlanDay"("cinemaId", "date");

-- CreateIndex
CREATE INDEX "MonthPlanDay_cinemaId_idx" ON "MonthPlanDay"("cinemaId");

-- CreateIndex
CREATE INDEX "MonthPlanDay_date_idx" ON "MonthPlanDay"("date");

-- CreateIndex
CREATE INDEX "MonthPlanDay_scheduleTemplateId_idx" ON "MonthPlanDay"("scheduleTemplateId");

-- CreateIndex
CREATE INDEX "MonthPlanDay_isActive_idx" ON "MonthPlanDay"("isActive");

-- AddForeignKey
ALTER TABLE "MonthPlanDay" ADD CONSTRAINT "MonthPlanDay_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthPlanDay" ADD CONSTRAINT "MonthPlanDay_scheduleTemplateId_fkey" FOREIGN KEY ("scheduleTemplateId") REFERENCES "ScheduleTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
