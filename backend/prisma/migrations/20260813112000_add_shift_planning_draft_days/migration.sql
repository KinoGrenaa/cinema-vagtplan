-- CreateTable
CREATE TABLE "ShiftPlanningDraftDay" (
    "id" SERIAL NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "draftId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "scheduleTemplateId" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftPlanningDraftDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShiftPlanningDraftDay_draftId_date_key"
ON "ShiftPlanningDraftDay"("draftId", "date");

-- CreateIndex
CREATE INDEX "ShiftPlanningDraftDay_cinemaId_idx"
ON "ShiftPlanningDraftDay"("cinemaId");

-- CreateIndex
CREATE INDEX "ShiftPlanningDraftDay_draftId_idx"
ON "ShiftPlanningDraftDay"("draftId");

-- CreateIndex
CREATE INDEX "ShiftPlanningDraftDay_date_idx"
ON "ShiftPlanningDraftDay"("date");

-- CreateIndex
CREATE INDEX "ShiftPlanningDraftDay_scheduleTemplateId_idx"
ON "ShiftPlanningDraftDay"("scheduleTemplateId");

-- CreateIndex
CREATE INDEX "ShiftPlanningDraftDay_isActive_idx"
ON "ShiftPlanningDraftDay"("isActive");

-- AddForeignKey
ALTER TABLE "ShiftPlanningDraftDay"
ADD CONSTRAINT "ShiftPlanningDraftDay_cinemaId_fkey"
FOREIGN KEY ("cinemaId")
REFERENCES "Cinema"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPlanningDraftDay"
ADD CONSTRAINT "ShiftPlanningDraftDay_draftId_fkey"
FOREIGN KEY ("draftId")
REFERENCES "ShiftPlanningDraft"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPlanningDraftDay"
ADD CONSTRAINT "ShiftPlanningDraftDay_scheduleTemplateId_fkey"
FOREIGN KEY ("scheduleTemplateId")
REFERENCES "ScheduleTemplate"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Compatibility snapshot for drafts created before day snapshots existed.
--
-- isActive/note were historically stored only in MonthPlanDay, so their
-- previous draft-specific value cannot be reconstructed. The current
-- workspace value is therefore used as the compatibility baseline.
--
-- scheduleTemplateId is preferably reconstructed from the individual
-- draft's saved ShiftPlanningDraftItem rows.
INSERT INTO "ShiftPlanningDraftDay" (
    "cinemaId",
    "draftId",
    "date",
    "isActive",
    "scheduleTemplateId",
    "note"
)
SELECT
    draft."cinemaId",
    draft."id",
    dates."date",
    COALESCE(
        month_day."isActive",
        TRUE
    ),
    COALESCE(
        draft_item."scheduleTemplateId",
        month_day."scheduleTemplateId"
    ),
    month_day."note"
FROM "ShiftPlanningDraft" AS draft
CROSS JOIN LATERAL (
    SELECT generate_series(
        make_date(
            draft."year",
            draft."month",
            1
        )::timestamp,
        (
            make_date(
                draft."year",
                draft."month",
                1
            )
            + INTERVAL '1 month'
            - INTERVAL '1 day'
        )::timestamp,
        INTERVAL '1 day'
    ) AS "date"
) AS dates
LEFT JOIN "MonthPlanDay" AS month_day
    ON month_day."cinemaId" = draft."cinemaId"
    AND month_day."date" = dates."date"
LEFT JOIN LATERAL (
    SELECT
        MAX(item."scheduleTemplateId")
            AS "scheduleTemplateId"
    FROM "ShiftPlanningDraftItem" AS item
    WHERE item."draftId" = draft."id"
      AND item."cinemaId" = draft."cinemaId"
      AND item."date" = dates."date"
) AS draft_item
    ON TRUE;