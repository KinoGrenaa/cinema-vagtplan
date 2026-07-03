ALTER TABLE "JobFunction" ADD COLUMN "workTypeId" INTEGER;

ALTER TABLE "JobFunction" ADD CONSTRAINT "JobFunction_workTypeId_fkey" FOREIGN KEY ("workTypeId") REFERENCES "WorkType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "JobFunction_workTypeId_idx" ON "JobFunction"("workTypeId");
