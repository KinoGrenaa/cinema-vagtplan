ALTER TABLE "LeaveRequest"
ADD COLUMN "cancellationNote" TEXT,
ADD COLUMN "rejectedAt" TIMESTAMP(3),
ADD COLUMN "rejectedByUserId" INTEGER,
ADD COLUMN "rejectionNote" TEXT;

CREATE INDEX "LeaveRequest_rejectedByUserId_idx"
ON "LeaveRequest"("rejectedByUserId");

ALTER TABLE "LeaveRequest"
ADD CONSTRAINT "LeaveRequest_rejectedByUserId_fkey"
FOREIGN KEY ("rejectedByUserId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
