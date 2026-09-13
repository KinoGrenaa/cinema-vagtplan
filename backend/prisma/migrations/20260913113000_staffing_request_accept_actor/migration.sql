-- Store the actor for future staffing-request acceptances.
-- Existing accepted requests remain without an actor because it cannot
-- be reconstructed safely from the current shift assignment.

ALTER TABLE "StaffingRequest"
ADD COLUMN "acceptedByUserId" INTEGER;

CREATE INDEX "StaffingRequest_acceptedByUserId_idx"
ON "StaffingRequest"("acceptedByUserId");

ALTER TABLE "StaffingRequest"
ADD CONSTRAINT "StaffingRequest_acceptedByUserId_fkey"
FOREIGN KEY ("acceptedByUserId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
