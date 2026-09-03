-- Opret den reserverede systemløntype pr. biograf uden at overskrive
-- en allerede konfigureret ekstern eksportkode.
INSERT INTO "PayrollType" (
  "cinemaId",
  "name",
  "payrollCode",
  "exportCode",
  "description",
  "isDefault",
  "isActive",
  "color",
  "createdAt",
  "updatedAt"
)
SELECT
  c."id",
  'Manuel registrering',
  'MANUAL_ENTRY',
  NULL,
  'Systemløntype til manuelle tidsregistreringer uden en planlagt vagt.',
  false,
  true,
  '#64748b',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Cinema" c
WHERE NOT EXISTS (
  SELECT 1
  FROM "PayrollType" p
  WHERE p."cinemaId" = c."id"
    AND p."payrollCode" = 'MANUAL_ENTRY'
);

-- Normaliser systemfelterne, men bevar den biografspecifikke eksportkode.
UPDATE "PayrollType"
SET
  "name" = 'Manuel registrering',
  "description" = 'Systemløntype til manuelle tidsregistreringer uden en planlagt vagt.',
  "isDefault" = false,
  "isActive" = true,
  "color" = '#64748b',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "payrollCode" = 'MANUAL_ENTRY';

-- Knyt eksisterende manuelle tidsregistreringer uden vagt til systemløntypen.
UPDATE "TimeEntry" te
SET "payrollTypeId" = pt."id"
FROM "PayrollType" pt
WHERE te."cinemaId" = pt."cinemaId"
  AND pt."payrollCode" = 'MANUAL_ENTRY'
  AND te."shiftId" IS NULL
  AND te."payrollTypeId" IS NULL;

-- Bevar samme løntype på eventuelle efterreguleringer for de historiske registreringer.
UPDATE "PayrollAdjustment" pa
SET "payrollTypeId" = pt."id"
FROM "TimeEntry" te, "PayrollType" pt
WHERE pa."timeEntryId" = te."id"
  AND te."cinemaId" = pt."cinemaId"
  AND pt."payrollCode" = 'MANUAL_ENTRY'
  AND te."shiftId" IS NULL
  AND pa."payrollTypeId" IS NULL;
