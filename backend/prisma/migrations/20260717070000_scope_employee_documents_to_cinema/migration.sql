-- Add the owning cinema before making the relation required.
ALTER TABLE "EmployeeDocument" ADD COLUMN "cinemaId" INTEGER;

-- Existing documents belonged operationally to the employee's home cinema.
UPDATE "EmployeeDocument" AS document
SET "cinemaId" = employee."cinemaId"
FROM "User" AS employee
WHERE document."userId" = employee."id"
  AND employee."cinemaId" IS NOT NULL;

-- Do not silently assign documents that cannot be placed in exactly one cinema.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "EmployeeDocument"
    WHERE "cinemaId" IS NULL
  ) THEN
    RAISE EXCEPTION 'EmployeeDocument migration failed: one or more existing documents have no employee home cinema';
  END IF;
END $$;

ALTER TABLE "EmployeeDocument" ALTER COLUMN "cinemaId" SET NOT NULL;

CREATE INDEX "EmployeeDocument_cinemaId_userId_idx"
ON "EmployeeDocument"("cinemaId", "userId");

ALTER TABLE "EmployeeDocument"
ADD CONSTRAINT "EmployeeDocument_cinemaId_fkey"
FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
