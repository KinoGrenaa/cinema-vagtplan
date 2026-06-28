-- Add cinema-scoped day periods used as hard planning/calculation frames.
CREATE TABLE "DayPeriod" (
    "id" SERIAL NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DayPeriod_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DayPeriod_cinemaId_idx" ON "DayPeriod"("cinemaId");
CREATE INDEX "DayPeriod_isActive_idx" ON "DayPeriod"("isActive");
CREATE INDEX "DayPeriod_startMinute_endMinute_idx" ON "DayPeriod"("startMinute", "endMinute");

ALTER TABLE "DayPeriod"
ADD CONSTRAINT "DayPeriod_cinemaId_fkey"
FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
