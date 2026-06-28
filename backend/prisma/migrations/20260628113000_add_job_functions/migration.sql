-- CreateTable
CREATE TABLE "JobFunction" (
    "id" SERIAL NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#2563eb',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "dayPeriodId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobFunction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserJobFunction" (
    "id" SERIAL NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "jobFunctionId" INTEGER NOT NULL,
    "assignedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserJobFunction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobFunction_cinemaId_idx" ON "JobFunction"("cinemaId");

-- CreateIndex
CREATE INDEX "JobFunction_dayPeriodId_idx" ON "JobFunction"("dayPeriodId");

-- CreateIndex
CREATE INDEX "JobFunction_isActive_idx" ON "JobFunction"("isActive");

-- CreateIndex
CREATE INDEX "UserJobFunction_cinemaId_idx" ON "UserJobFunction"("cinemaId");

-- CreateIndex
CREATE INDEX "UserJobFunction_userId_idx" ON "UserJobFunction"("userId");

-- CreateIndex
CREATE INDEX "UserJobFunction_jobFunctionId_idx" ON "UserJobFunction"("jobFunctionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserJobFunction_userId_jobFunctionId_key" ON "UserJobFunction"("userId", "jobFunctionId");

-- AddForeignKey
ALTER TABLE "JobFunction" ADD CONSTRAINT "JobFunction_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobFunction" ADD CONSTRAINT "JobFunction_dayPeriodId_fkey" FOREIGN KEY ("dayPeriodId") REFERENCES "DayPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserJobFunction" ADD CONSTRAINT "UserJobFunction_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserJobFunction" ADD CONSTRAINT "UserJobFunction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserJobFunction" ADD CONSTRAINT "UserJobFunction_jobFunctionId_fkey" FOREIGN KEY ("jobFunctionId") REFERENCES "JobFunction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserJobFunction" ADD CONSTRAINT "UserJobFunction_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
