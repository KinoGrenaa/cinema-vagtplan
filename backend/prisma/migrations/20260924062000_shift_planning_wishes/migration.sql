-- AlterTable
ALTER TABLE "ShiftPlanningDraftItem"
ADD COLUMN "wishEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ShiftPlanningWishRound" (
    "id" SERIAL NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "draftId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closesAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "openedByUserId" INTEGER,
    "closedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftPlanningWishRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftPlanningDraftWish" (
    "id" SERIAL NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "draftItemId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "withdrawnAt" TIMESTAMP(3),

    CONSTRAINT "ShiftPlanningDraftWish_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShiftPlanningWishRound_draftId_key"
ON "ShiftPlanningWishRound"("draftId");

-- CreateIndex
CREATE INDEX "ShiftPlanningWishRound_cinemaId_status_idx"
ON "ShiftPlanningWishRound"("cinemaId", "status");

-- CreateIndex
CREATE INDEX "ShiftPlanningWishRound_closesAt_idx"
ON "ShiftPlanningWishRound"("closesAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftPlanningDraftWish_draftItemId_userId_key"
ON "ShiftPlanningDraftWish"("draftItemId", "userId");

-- CreateIndex
CREATE INDEX "ShiftPlanningDraftWish_cinemaId_idx"
ON "ShiftPlanningDraftWish"("cinemaId");

-- CreateIndex
CREATE INDEX "ShiftPlanningDraftWish_userId_withdrawnAt_idx"
ON "ShiftPlanningDraftWish"("userId", "withdrawnAt");

-- CreateIndex
CREATE INDEX "ShiftPlanningDraftWish_draftItemId_withdrawnAt_idx"
ON "ShiftPlanningDraftWish"("draftItemId", "withdrawnAt");

-- AddForeignKey
ALTER TABLE "ShiftPlanningWishRound"
ADD CONSTRAINT "ShiftPlanningWishRound_cinemaId_fkey"
FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPlanningWishRound"
ADD CONSTRAINT "ShiftPlanningWishRound_draftId_fkey"
FOREIGN KEY ("draftId") REFERENCES "ShiftPlanningDraft"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPlanningWishRound"
ADD CONSTRAINT "ShiftPlanningWishRound_openedByUserId_fkey"
FOREIGN KEY ("openedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPlanningWishRound"
ADD CONSTRAINT "ShiftPlanningWishRound_closedByUserId_fkey"
FOREIGN KEY ("closedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPlanningDraftWish"
ADD CONSTRAINT "ShiftPlanningDraftWish_cinemaId_fkey"
FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPlanningDraftWish"
ADD CONSTRAINT "ShiftPlanningDraftWish_draftItemId_fkey"
FOREIGN KEY ("draftItemId") REFERENCES "ShiftPlanningDraftItem"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPlanningDraftWish"
ADD CONSTRAINT "ShiftPlanningDraftWish_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
