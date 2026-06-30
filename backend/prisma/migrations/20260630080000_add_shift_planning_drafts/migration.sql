-- CreateTable
CREATE TABLE "ShiftPlanningDraft" (
    "id" SERIAL NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "source" TEXT NOT NULL DEFAULT 'MONTH_PLAN',
    "note" TEXT,
    "warnings" JSONB,
    "createdByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftPlanningDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftPlanningDraftItem" (
    "id" SERIAL NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "draftId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "monthPlanDayId" INTEGER,
    "scheduleTemplateId" INTEGER,
    "scheduleTemplateDayId" INTEGER,
    "templateJobFunctionId" INTEGER,
    "jobFunctionId" INTEGER,
    "userId" INTEGER,
    "requiredIndex" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "plannedStartMinute" INTEGER,
    "plannedEndMinute" INTEGER,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "warningCode" TEXT,
    "warningMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftPlanningDraftItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShiftPlanningDraft_cinemaId_idx" ON "ShiftPlanningDraft"("cinemaId");

-- CreateIndex
CREATE INDEX "ShiftPlanningDraft_year_month_idx" ON "ShiftPlanningDraft"("year", "month");

-- CreateIndex
CREATE INDEX "ShiftPlanningDraft_status_idx" ON "ShiftPlanningDraft"("status");

-- CreateIndex
CREATE INDEX "ShiftPlanningDraft_createdAt_idx" ON "ShiftPlanningDraft"("createdAt");

-- CreateIndex
CREATE INDEX "ShiftPlanningDraftItem_cinemaId_idx" ON "ShiftPlanningDraftItem"("cinemaId");

-- CreateIndex
CREATE INDEX "ShiftPlanningDraftItem_draftId_idx" ON "ShiftPlanningDraftItem"("draftId");

-- CreateIndex
CREATE INDEX "ShiftPlanningDraftItem_date_idx" ON "ShiftPlanningDraftItem"("date");

-- CreateIndex
CREATE INDEX "ShiftPlanningDraftItem_monthPlanDayId_idx" ON "ShiftPlanningDraftItem"("monthPlanDayId");

-- CreateIndex
CREATE INDEX "ShiftPlanningDraftItem_scheduleTemplateId_idx" ON "ShiftPlanningDraftItem"("scheduleTemplateId");

-- CreateIndex
CREATE INDEX "ShiftPlanningDraftItem_scheduleTemplateDayId_idx" ON "ShiftPlanningDraftItem"("scheduleTemplateDayId");

-- CreateIndex
CREATE INDEX "ShiftPlanningDraftItem_templateJobFunctionId_idx" ON "ShiftPlanningDraftItem"("templateJobFunctionId");

-- CreateIndex
CREATE INDEX "ShiftPlanningDraftItem_jobFunctionId_idx" ON "ShiftPlanningDraftItem"("jobFunctionId");

-- CreateIndex
CREATE INDEX "ShiftPlanningDraftItem_userId_idx" ON "ShiftPlanningDraftItem"("userId");

-- CreateIndex
CREATE INDEX "ShiftPlanningDraftItem_status_idx" ON "ShiftPlanningDraftItem"("status");

-- AddForeignKey
ALTER TABLE "ShiftPlanningDraft" ADD CONSTRAINT "ShiftPlanningDraft_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPlanningDraft" ADD CONSTRAINT "ShiftPlanningDraft_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPlanningDraftItem" ADD CONSTRAINT "ShiftPlanningDraftItem_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPlanningDraftItem" ADD CONSTRAINT "ShiftPlanningDraftItem_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ShiftPlanningDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPlanningDraftItem" ADD CONSTRAINT "ShiftPlanningDraftItem_monthPlanDayId_fkey" FOREIGN KEY ("monthPlanDayId") REFERENCES "MonthPlanDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPlanningDraftItem" ADD CONSTRAINT "ShiftPlanningDraftItem_scheduleTemplateId_fkey" FOREIGN KEY ("scheduleTemplateId") REFERENCES "ScheduleTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPlanningDraftItem" ADD CONSTRAINT "ShiftPlanningDraftItem_scheduleTemplateDayId_fkey" FOREIGN KEY ("scheduleTemplateDayId") REFERENCES "ScheduleTemplateDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPlanningDraftItem" ADD CONSTRAINT "ShiftPlanningDraftItem_templateJobFunctionId_fkey" FOREIGN KEY ("templateJobFunctionId") REFERENCES "ScheduleTemplateJobFunction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPlanningDraftItem" ADD CONSTRAINT "ShiftPlanningDraftItem_jobFunctionId_fkey" FOREIGN KEY ("jobFunctionId") REFERENCES "JobFunction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPlanningDraftItem" ADD CONSTRAINT "ShiftPlanningDraftItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
