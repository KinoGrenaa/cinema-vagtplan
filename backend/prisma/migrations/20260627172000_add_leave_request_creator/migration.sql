-- Track who created a leave request, separately from who the leave is for.
ALTER TABLE "LeaveRequest" ADD COLUMN "createdByUserId" INTEGER;

UPDATE "LeaveRequest"
SET "createdByUserId" = "userId"
WHERE "createdByUserId" IS NULL;

CREATE INDEX "LeaveRequest_createdByUserId_idx" ON "LeaveRequest"("createdByUserId");

ALTER TABLE "LeaveRequest"
ADD CONSTRAINT "LeaveRequest_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
