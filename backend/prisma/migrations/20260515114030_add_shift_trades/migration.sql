-- CreateEnum
CREATE TYPE "ShiftTradeStatus" AS ENUM ('OPEN', 'ACCEPTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ShiftTrade" (
    "id" SERIAL NOT NULL,
    "status" "ShiftTradeStatus" NOT NULL DEFAULT 'OPEN',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shiftId" INTEGER NOT NULL,
    "offeredByUserId" INTEGER NOT NULL,
    "acceptedByUserId" INTEGER,
    "cinemaId" INTEGER NOT NULL,

    CONSTRAINT "ShiftTrade_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ShiftTrade" ADD CONSTRAINT "ShiftTrade_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftTrade" ADD CONSTRAINT "ShiftTrade_offeredByUserId_fkey" FOREIGN KEY ("offeredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftTrade" ADD CONSTRAINT "ShiftTrade_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftTrade" ADD CONSTRAINT "ShiftTrade_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
