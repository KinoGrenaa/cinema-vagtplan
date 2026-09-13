-- CreateTable
CREATE TABLE "StaffingRequestDecline" (
    "id" SERIAL NOT NULL,
    "staffingRequestId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "declinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffingRequestDecline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffingRequestDecline_staffingRequestId_userId_key"
ON "StaffingRequestDecline"("staffingRequestId", "userId");

-- CreateIndex
CREATE INDEX "StaffingRequestDecline_staffingRequestId_idx"
ON "StaffingRequestDecline"("staffingRequestId");

-- CreateIndex
CREATE INDEX "StaffingRequestDecline_userId_idx"
ON "StaffingRequestDecline"("userId");

-- CreateIndex
CREATE INDEX "StaffingRequestDecline_declinedAt_idx"
ON "StaffingRequestDecline"("declinedAt");

-- AddForeignKey
ALTER TABLE "StaffingRequestDecline"
ADD CONSTRAINT "StaffingRequestDecline_staffingRequestId_fkey"
FOREIGN KEY ("staffingRequestId")
REFERENCES "StaffingRequest"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffingRequestDecline"
ADD CONSTRAINT "StaffingRequestDecline_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
