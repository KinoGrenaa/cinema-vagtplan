CREATE TABLE "CinemaAutomaticTimeRegistrationVersion" (
    "id" SERIAL NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CinemaAutomaticTimeRegistrationVersion_pkey"
        PRIMARY KEY ("id")
);

CREATE INDEX "CinemaAutomaticTimeRegistrationVersion_cinemaId_validFrom_validTo_idx"
ON "CinemaAutomaticTimeRegistrationVersion"(
    "cinemaId",
    "validFrom",
    "validTo"
);

CREATE INDEX "CinemaAutomaticTimeRegistrationVersion_cinemaId_validTo_idx"
ON "CinemaAutomaticTimeRegistrationVersion"(
    "cinemaId",
    "validTo"
);

ALTER TABLE "CinemaAutomaticTimeRegistrationVersion"
ADD CONSTRAINT "CinemaAutomaticTimeRegistrationVersion_cinemaId_fkey"
FOREIGN KEY ("cinemaId")
REFERENCES "Cinema"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

INSERT INTO "CinemaAutomaticTimeRegistrationVersion" (
    "cinemaId",
    "method",
    "minutes",
    "validFrom",
    "validTo"
)
SELECT
    "id",
    "automaticTimeRegistrationMethod",
    "automaticTimeRegistrationMinutes",
    "automaticTimeRegistrationActiveFrom",
    NULL
FROM "Cinema"
WHERE
    "automaticTimeRegistrationEnabled" = true
    AND "automaticTimeRegistrationActiveFrom" IS NOT NULL;
