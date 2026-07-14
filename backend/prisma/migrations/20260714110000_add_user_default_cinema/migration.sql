-- AddColumn
ALTER TABLE "User"
ADD COLUMN "defaultCinemaId" INTEGER;

-- Backfill existing standard cinemas
UPDATE "User"
SET "defaultCinemaId" = "cinemaId"
WHERE "cinemaId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "User_defaultCinemaId_idx"
ON "User"("defaultCinemaId");

-- AddForeignKey
ALTER TABLE "User"
ADD CONSTRAINT "User_defaultCinemaId_fkey"
FOREIGN KEY ("defaultCinemaId") REFERENCES "Cinema"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
