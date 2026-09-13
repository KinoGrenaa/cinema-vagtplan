-- Personlige svar på åbne vagtpuljetilbud.
CREATE TABLE "ShiftTradeDecline" (
    "id" SERIAL NOT NULL,
    "shiftTradeId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "declinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftTradeDecline_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShiftTradeDecline_shiftTradeId_userId_key"
ON "ShiftTradeDecline"("shiftTradeId", "userId");

CREATE INDEX "ShiftTradeDecline_shiftTradeId_idx"
ON "ShiftTradeDecline"("shiftTradeId");

CREATE INDEX "ShiftTradeDecline_userId_idx"
ON "ShiftTradeDecline"("userId");

CREATE INDEX "ShiftTradeDecline_declinedAt_idx"
ON "ShiftTradeDecline"("declinedAt");

ALTER TABLE "ShiftTradeDecline"
ADD CONSTRAINT "ShiftTradeDecline_shiftTradeId_fkey"
FOREIGN KEY ("shiftTradeId") REFERENCES "ShiftTrade"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShiftTradeDecline"
ADD CONSTRAINT "ShiftTradeDecline_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
