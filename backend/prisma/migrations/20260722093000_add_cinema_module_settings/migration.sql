CREATE TABLE "CinemaModuleSetting" (
    "id" SERIAL NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CinemaModuleSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CinemaModuleSetting_cinemaId_moduleKey_key"
ON "CinemaModuleSetting"("cinemaId", "moduleKey");

CREATE INDEX "CinemaModuleSetting_cinemaId_enabled_idx"
ON "CinemaModuleSetting"("cinemaId", "enabled");

ALTER TABLE "CinemaModuleSetting"
ADD CONSTRAINT "CinemaModuleSetting_cinemaId_fkey"
FOREIGN KEY ("cinemaId")
REFERENCES "Cinema"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

INSERT INTO "CinemaModuleSetting" (
    "cinemaId",
    "moduleKey",
    "enabled",
    "createdAt",
    "updatedAt"
)
SELECT
    cinema."id",
    module."moduleKey",
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Cinema" AS cinema
CROSS JOIN (
    VALUES
        ('SCHEDULE'),
        ('SHIFT_PLANNING'),
        ('TIME_TRACKING'),
        ('PAYROLL'),
        ('LEAVE'),
        ('SHIFT_TRADES'),
        ('STAFFING_REQUESTS'),
        ('MESSAGES'),
        ('EMPLOYEE_DOCUMENTS'),
        ('STAFFING_AI')
) AS module("moduleKey")
ON CONFLICT ("cinemaId", "moduleKey") DO NOTHING;
