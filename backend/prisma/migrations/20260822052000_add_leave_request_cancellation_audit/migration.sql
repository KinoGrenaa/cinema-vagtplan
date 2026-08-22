ALTER TABLE "LeaveRequest"
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancelledByUserId" INTEGER;

CREATE INDEX "LeaveRequest_cancelledByUserId_idx"
ON "LeaveRequest"("cancelledByUserId");

ALTER TABLE "LeaveRequest"
ADD CONSTRAINT "LeaveRequest_cancelledByUserId_fkey"
FOREIGN KEY ("cancelledByUserId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
