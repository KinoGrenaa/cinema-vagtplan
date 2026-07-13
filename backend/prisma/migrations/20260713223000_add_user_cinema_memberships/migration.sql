-- CreateTable
CREATE TABLE "UserCinemaMembership" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCinemaMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCinemaMembership_userId_cinemaId_key"
ON "UserCinemaMembership"("userId", "cinemaId");

-- CreateIndex
CREATE INDEX "UserCinemaMembership_userId_idx"
ON "UserCinemaMembership"("userId");

-- CreateIndex
CREATE INDEX "UserCinemaMembership_cinemaId_idx"
ON "UserCinemaMembership"("cinemaId");

-- CreateIndex
CREATE INDEX "UserCinemaMembership_isActive_idx"
ON "UserCinemaMembership"("isActive");

-- AddForeignKey
ALTER TABLE "UserCinemaMembership"
ADD CONSTRAINT "UserCinemaMembership_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCinemaMembership"
ADD CONSTRAINT "UserCinemaMembership_cinemaId_fkey"
FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing primary cinema assignments
INSERT INTO "UserCinemaMembership" (
    "userId",
    "cinemaId",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "cinemaId",
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User"
WHERE "cinemaId" IS NOT NULL
ON CONFLICT ("userId", "cinemaId") DO NOTHING;
