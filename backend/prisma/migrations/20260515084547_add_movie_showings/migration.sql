-- CreateTable
CREATE TABLE "MovieShowing" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "hall" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "soldSeats" INTEGER NOT NULL DEFAULT 0,
    "freeSeats" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cinemaId" INTEGER NOT NULL,

    CONSTRAINT "MovieShowing_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MovieShowing" ADD CONSTRAINT "MovieShowing_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
