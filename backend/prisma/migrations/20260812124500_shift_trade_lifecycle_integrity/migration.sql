-- Bevar historiske vagtbytter efter at den levende vagt slettes.
ALTER TABLE "ShiftTrade"
  ADD COLUMN "shiftStartTimeSnapshot" TIMESTAMP(3),
  ADD COLUMN "shiftEndTimeSnapshot" TIMESTAMP(3),
  ADD COLUMN "jobFunctionIdSnapshot" INTEGER,
  ADD COLUMN "jobFunctionNameSnapshot" TEXT,
  ADD COLUMN "jobFunctionColorSnapshot" TEXT;

UPDATE "ShiftTrade" AS trade
SET
  "shiftStartTimeSnapshot" = shift."startTime",
  "shiftEndTimeSnapshot" = shift."endTime",
  "jobFunctionIdSnapshot" = shift."jobFunctionId",
  "jobFunctionNameSnapshot" = shift."jobFunctionNameSnapshot",
  "jobFunctionColorSnapshot" = shift."jobFunctionColorSnapshot"
FROM "Shift" AS shift
WHERE shift."id" = trade."shiftId";

ALTER TABLE "ShiftTrade"
  ALTER COLUMN "shiftStartTimeSnapshot" SET NOT NULL,
  ALTER COLUMN "shiftEndTimeSnapshot" SET NOT NULL,
  ALTER COLUMN "jobFunctionIdSnapshot" SET NOT NULL,
  ALTER COLUMN "jobFunctionNameSnapshot" SET NOT NULL,
  ALTER COLUMN "jobFunctionColorSnapshot" SET NOT NULL,
  ALTER COLUMN "shiftId" DROP NOT NULL;

ALTER TABLE "ShiftTrade"
  DROP CONSTRAINT "ShiftTrade_shiftId_fkey";

ALTER TABLE "ShiftTrade"
  ADD CONSTRAINT "ShiftTrade_shiftId_fkey"
  FOREIGN KEY ("shiftId") REFERENCES "Shift"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ShiftTrade_shiftId_idx"
  ON "ShiftTrade"("shiftId");

-- Ryd eksisterende forældede åbne bytteforløb efter manuel omfordeling.
UPDATE "ShiftTrade" AS trade
SET "status" = 'CANCELLED'
FROM "Shift" AS shift
WHERE trade."shiftId" = shift."id"
  AND trade."status" = 'OPEN'
  AND shift."userId" IS DISTINCT FROM trade."offeredByUserId";

-- Ryd eksisterende åbne bemandingsforespørgsler, hvis vagten allerede er
-- blevet tildelt, eller hvis den koblede vagt tidligere er blevet slettet.
UPDATE "StaffingRequest" AS request
SET "status" = 'CANCELLED'
FROM "Shift" AS shift
WHERE request."shiftId" = shift."id"
  AND request."status" = 'PENDING'
  AND shift."userId" IS NOT NULL;

UPDATE "StaffingRequest"
SET "status" = 'CANCELLED'
WHERE "status" = 'PENDING'
  AND "shiftId" IS NULL;

-- Gamle direkte-tilbudsnotifikationer er kun handlingslinks. Når deres
-- bytte ikke længere er åbent, markeres de som afsluttede.
UPDATE "Notification" AS notification
SET
  "isRead" = TRUE,
  "linkUrl" = NULL
FROM "ShiftTrade" AS trade
WHERE notification."cinemaId" = trade."cinemaId"
  AND notification."type" = 'SHIFT_DIRECT'
  AND notification."linkUrl" = '/shift-trades?tradeId=' || trade."id"
  AND trade."status" <> 'OPEN';
