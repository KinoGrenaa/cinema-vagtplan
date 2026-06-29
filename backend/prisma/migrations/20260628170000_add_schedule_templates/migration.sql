-- CreateEnum
CREATE TYPE "ScheduleTemplateWeekParity" AS ENUM ('ANY', 'EVEN', 'ODD');

-- CreateTable
CREATE TABLE "ScheduleTemplate" (
    "id" SERIAL NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "weekParity" "ScheduleTemplateWeekParity" NOT NULL DEFAULT 'ANY',
    "startsOn" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleTemplateDay" (
    "id" SERIAL NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "templateId" INTEGER NOT NULL,
    "weekday" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleTemplateDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleTemplateJobFunction" (
    "id" SERIAL NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "templateDayId" INTEGER NOT NULL,
    "jobFunctionId" INTEGER NOT NULL,
    "requiredCount" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleTemplateJobFunction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleTemplateAssignment" (
    "id" SERIAL NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "templateJobFunctionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleTemplateAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduleTemplate_cinemaId_idx" ON "ScheduleTemplate"("cinemaId");
CREATE INDEX "ScheduleTemplate_isActive_idx" ON "ScheduleTemplate"("isActive");
CREATE INDEX "ScheduleTemplate_weekParity_idx" ON "ScheduleTemplate"("weekParity");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleTemplateDay_templateId_weekday_key" ON "ScheduleTemplateDay"("templateId", "weekday");
CREATE INDEX "ScheduleTemplateDay_cinemaId_idx" ON "ScheduleTemplateDay"("cinemaId");
CREATE INDEX "ScheduleTemplateDay_templateId_idx" ON "ScheduleTemplateDay"("templateId");
CREATE INDEX "ScheduleTemplateDay_weekday_idx" ON "ScheduleTemplateDay"("weekday");
CREATE INDEX "ScheduleTemplateDay_isActive_idx" ON "ScheduleTemplateDay"("isActive");

-- CreateIndex
CREATE INDEX "ScheduleTemplateJobFunction_cinemaId_idx" ON "ScheduleTemplateJobFunction"("cinemaId");
CREATE INDEX "ScheduleTemplateJobFunction_templateDayId_idx" ON "ScheduleTemplateJobFunction"("templateDayId");
CREATE INDEX "ScheduleTemplateJobFunction_jobFunctionId_idx" ON "ScheduleTemplateJobFunction"("jobFunctionId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleTemplateAssignment_templateJobFunctionId_userId_key" ON "ScheduleTemplateAssignment"("templateJobFunctionId", "userId");
CREATE INDEX "ScheduleTemplateAssignment_cinemaId_idx" ON "ScheduleTemplateAssignment"("cinemaId");
CREATE INDEX "ScheduleTemplateAssignment_templateJobFunctionId_idx" ON "ScheduleTemplateAssignment"("templateJobFunctionId");
CREATE INDEX "ScheduleTemplateAssignment_userId_idx" ON "ScheduleTemplateAssignment"("userId");

-- AddForeignKey
ALTER TABLE "ScheduleTemplate" ADD CONSTRAINT "ScheduleTemplate_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleTemplateDay" ADD CONSTRAINT "ScheduleTemplateDay_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleTemplateDay" ADD CONSTRAINT "ScheduleTemplateDay_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ScheduleTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduleTemplateJobFunction" ADD CONSTRAINT "ScheduleTemplateJobFunction_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleTemplateJobFunction" ADD CONSTRAINT "ScheduleTemplateJobFunction_templateDayId_fkey" FOREIGN KEY ("templateDayId") REFERENCES "ScheduleTemplateDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduleTemplateJobFunction" ADD CONSTRAINT "ScheduleTemplateJobFunction_jobFunctionId_fkey" FOREIGN KEY ("jobFunctionId") REFERENCES "JobFunction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleTemplateAssignment" ADD CONSTRAINT "ScheduleTemplateAssignment_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleTemplateAssignment" ADD CONSTRAINT "ScheduleTemplateAssignment_templateJobFunctionId_fkey" FOREIGN KEY ("templateJobFunctionId") REFERENCES "ScheduleTemplateJobFunction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduleTemplateAssignment" ADD CONSTRAINT "ScheduleTemplateAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
