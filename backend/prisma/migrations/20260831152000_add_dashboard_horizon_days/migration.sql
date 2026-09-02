-- Persist each user's preferred forward-looking dashboard horizon.
ALTER TABLE "User"
ADD COLUMN "dashboardHorizonDays" INTEGER NOT NULL DEFAULT 10;
