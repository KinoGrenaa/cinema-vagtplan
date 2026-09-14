-- CreateEnum
CREATE TYPE "StaffingRequestCancellationReason" AS ENUM (
  'MANUAL_CANCELLED',
  'SHIFT_REASSIGNED',
  'SHIFT_UNASSIGNED',
  'SHIFT_DELETED',
  'SHIFT_MOVED',
  'OTHER_REQUEST_ACCEPTED'
);

-- AlterTable
ALTER TABLE "StaffingRequest"
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancelledByUserId" INTEGER,
ADD COLUMN "cancellationReason" "StaffingRequestCancellationReason";

-- CreateIndex
CREATE INDEX "StaffingRequest_cancelledByUserId_idx"
ON "StaffingRequest"("cancelledByUserId");

-- AddForeignKey
ALTER TABLE "StaffingRequest"
ADD CONSTRAINT "StaffingRequest_cancelledByUserId_fkey"
FOREIGN KEY ("cancelledByUserId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
