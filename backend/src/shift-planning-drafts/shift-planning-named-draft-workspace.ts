import { Prisma } from '@prisma/client';

import type { PrismaService } from '../prisma/prisma.service';
import { buildShiftPlanningMonthData } from './shift-planning-month-working-preview';

export class EmptyShiftPlanningNamedDraftError extends Error {
  constructor() {
    super('Arbejdsforslaget indeholder ingen vagter og kan ikke gemmes som kladde.');
    this.name = 'EmptyShiftPlanningNamedDraftError';
  }
}

export class ShiftPlanningNamedDraftNotFoundError extends Error {
  constructor() {
    super('Kladden findes ikke.');
    this.name = 'ShiftPlanningNamedDraftNotFoundError';
  }
}

export class ShiftPlanningNamedDraftNotEditableError extends Error {
  constructor() {
    super('Kun en åben kladde kan redigeres.');
    this.name = 'ShiftPlanningNamedDraftNotEditableError';
  }
}

type SaveNamedDraftInput = {
  cinemaId: number;
  year: number;
  month: number;
  name: string;
  actorUserId: number | null;
};

type CopyNamedDraftInput = {
  sourceDraftId: number;
  cinemaId: number;
  name: string;
  actorUserId: number | null;
};

type ExistingNamedDraftInput = {
  draftId: number;
  cinemaId: number;
};

type CreateEmptyNamedDraftInput = SaveNamedDraftInput;

type MonthDataBuilder = typeof buildShiftPlanningMonthData;

type DraftRow = {
  id: number;
  cinemaId: number;
  year: number;
  month: number;
  status: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function monthBounds(year: number, month: number) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

function requireEditableDraft(draft: DraftRow | undefined) {
  if (!draft) {
    throw new ShiftPlanningNamedDraftNotFoundError();
  }
  if (String(draft.status).toUpperCase() !== 'DRAFT') {
    throw new ShiftPlanningNamedDraftNotEditableError();
  }
  return draft;
}

async function findEditableDraft(
  prisma: Pick<PrismaService, '$queryRaw'>,
  input: ExistingNamedDraftInput,
) {
  const rows = await prisma.$queryRaw<DraftRow[]>(Prisma.sql`
    SELECT
      id,
      "cinemaId",
      year,
      month,
      status,
      note,
      "createdAt",
      "updatedAt"
    FROM "ShiftPlanningDraft"
    WHERE id = ${input.draftId}
      AND "cinemaId" = ${input.cinemaId}
    LIMIT 1
  `);

  return requireEditableDraft(rows[0]);
}

export async function saveNamedShiftPlanningDraft(
  prisma: PrismaService,
  input: SaveNamedDraftInput,
  buildMonthData: MonthDataBuilder = buildShiftPlanningMonthData,
) {
  const generated = await buildMonthData(
    prisma,
    input.cinemaId,
    input.year,
    input.month,
  );

  if (generated.items.length === 0) {
    throw new EmptyShiftPlanningNamedDraftError();
  }

  return prisma.$transaction(async (tx) => {
    const draft = await tx.shiftPlanningDraft.create({
      data: {
        cinemaId: input.cinemaId,
        year: input.year,
        month: input.month,
        status: 'DRAFT',
        source: 'MONTH_PLAN',
        note: input.name,
        warnings: toJsonValue(generated.warnings),
        createdByUserId: input.actorUserId,
      },
      select: {
        id: true,
        cinemaId: true,
        year: true,
        month: true,
        status: true,
        note: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await tx.shiftPlanningDraftItem.createMany({
      data: generated.items.map((item) => ({
        cinemaId: input.cinemaId,
        draftId: draft.id,
        date: item.date,
        monthPlanDayId: item.monthPlanDayId,
        scheduleTemplateId: item.scheduleTemplateId,
        scheduleTemplateDayId: item.scheduleTemplateDayId,
        templateJobFunctionId: item.templateJobFunctionId,
        jobFunctionId: item.jobFunctionId,
        userId: item.userId,
        requiredIndex: item.requiredIndex,
        status: 'DRAFT',
        plannedStartMinute: item.plannedStartMinute,
        plannedEndMinute: item.plannedEndMinute,
        warningCode: item.warningCode,
        warningMessage: item.warningMessage,
        metadata: toJsonValue(item.metadata),
      })),
    });

    return {
      ...draft,
      itemCount: generated.items.length,
      warningCount: generated.warnings.length,
    };
  });
}

export async function createEmptyNamedShiftPlanningDraft(
  prisma: PrismaService,
  input: CreateEmptyNamedDraftInput,
) {
  const rows = await prisma.$queryRaw<DraftRow[]>(Prisma.sql`
    INSERT INTO "ShiftPlanningDraft" (
      "cinemaId",
      year,
      month,
      status,
      source,
      note,
      warnings,
      "createdByUserId"
    )
    VALUES (
      ${input.cinemaId},
      ${input.year},
      ${input.month},
      'DRAFT',
      'MONTH_PLAN',
      ${input.name},
      '[]'::jsonb,
      ${input.actorUserId}
    )
    RETURNING
      id,
      "cinemaId",
      year,
      month,
      status,
      note,
      "createdAt",
      "updatedAt"
  `);

  const draft = rows[0];
  if (!draft) {
    throw new ShiftPlanningNamedDraftNotFoundError();
  }

  return { ...draft, itemCount: 0, warningCount: 0 };
}

export async function openNamedShiftPlanningDraftWorkspace(
  prisma: PrismaService,
  input: ExistingNamedDraftInput,
) {
  const draft = await findEditableDraft(prisma, input);
  const { start, end } = monthBounds(draft.year, draft.month);

  return prisma.$transaction(async (tx) => {
    const lockedRows = await tx.$queryRaw<DraftRow[]>(Prisma.sql`
      SELECT
        id,
        "cinemaId",
        year,
        month,
        status,
        note,
        "createdAt",
        "updatedAt"
      FROM "ShiftPlanningDraft"
      WHERE id = ${input.draftId}
        AND "cinemaId" = ${input.cinemaId}
      FOR UPDATE
    `);
    requireEditableDraft(lockedRows[0]);

    const clearedDayCount = await tx.$executeRaw(Prisma.sql`
      UPDATE "MonthPlanDay"
      SET
        "scheduleTemplateId" = NULL,
        "updatedAt" = NOW()
      WHERE "cinemaId" = ${input.cinemaId}
        AND date >= ${start}
        AND date < ${end}
    `);

    const restoredTemplateDayCount = await tx.$executeRaw(Prisma.sql`
      UPDATE "MonthPlanDay" month_day
      SET
        "scheduleTemplateId" = source_item."scheduleTemplateId",
        "updatedAt" = NOW()
      FROM (
        SELECT
          date,
          MAX("scheduleTemplateId") AS "scheduleTemplateId"
        FROM "ShiftPlanningDraftItem"
        WHERE "draftId" = ${input.draftId}
          AND "cinemaId" = ${input.cinemaId}
          AND "scheduleTemplateId" IS NOT NULL
        GROUP BY date
      ) source_item
      WHERE month_day."cinemaId" = ${input.cinemaId}
        AND month_day.date = source_item.date
        AND month_day.date >= ${start}
        AND month_day.date < ${end}
    `);

    return {
      draftId: draft.id,
      year: draft.year,
      month: draft.month,
      clearedDayCount: Number(clearedDayCount),
      restoredTemplateDayCount: Number(restoredTemplateDayCount),
    };
  });
}

export async function updateNamedShiftPlanningDraft(
  prisma: PrismaService,
  input: ExistingNamedDraftInput,
  buildMonthData: MonthDataBuilder = buildShiftPlanningMonthData,
) {
  const draft = await findEditableDraft(prisma, input);
  const generated = await buildMonthData(
    prisma,
    input.cinemaId,
    draft.year,
    draft.month,
  );
  const warningsJson = JSON.stringify(generated.warnings);

  return prisma.$transaction(async (tx) => {
    const lockedRows = await tx.$queryRaw<DraftRow[]>(Prisma.sql`
      SELECT
        id,
        "cinemaId",
        year,
        month,
        status,
        note,
        "createdAt",
        "updatedAt"
      FROM "ShiftPlanningDraft"
      WHERE id = ${input.draftId}
        AND "cinemaId" = ${input.cinemaId}
      FOR UPDATE
    `);
    const lockedDraft = requireEditableDraft(lockedRows[0]);

    await tx.shiftPlanningDraftItem.deleteMany({
      where: {
        draftId: input.draftId,
        cinemaId: input.cinemaId,
      },
    });

    if (generated.items.length > 0) {
      await tx.shiftPlanningDraftItem.createMany({
        data: generated.items.map((item) => ({
          cinemaId: input.cinemaId,
          draftId: input.draftId,
          date: item.date,
          monthPlanDayId: item.monthPlanDayId,
          scheduleTemplateId: item.scheduleTemplateId,
          scheduleTemplateDayId: item.scheduleTemplateDayId,
          templateJobFunctionId: item.templateJobFunctionId,
          jobFunctionId: item.jobFunctionId,
          userId: item.userId,
          requiredIndex: item.requiredIndex,
          status: 'DRAFT',
          plannedStartMinute: item.plannedStartMinute,
          plannedEndMinute: item.plannedEndMinute,
          warningCode: item.warningCode,
          warningMessage: item.warningMessage,
          metadata: toJsonValue(item.metadata),
        })),
      });
    }

    await tx.$executeRaw(Prisma.sql`
      UPDATE "ShiftPlanningDraft"
      SET
        warnings = ${warningsJson}::jsonb,
        "updatedAt" = NOW()
      WHERE id = ${input.draftId}
        AND "cinemaId" = ${input.cinemaId}
    `);

    return {
      ...lockedDraft,
      itemCount: generated.items.length,
      warningCount: generated.warnings.length,
    };
  });
}

export async function copyNamedShiftPlanningDraft(
  prisma: PrismaService,
  input: CopyNamedDraftInput,
) {
  return prisma.$transaction(async (tx) => {
    const copiedDraftRows = await tx.$queryRaw<DraftRow[]>(Prisma.sql`
      INSERT INTO "ShiftPlanningDraft" (
        "cinemaId",
        year,
        month,
        status,
        source,
        note,
        warnings,
        "createdByUserId"
      )
      SELECT
        source_draft."cinemaId",
        source_draft.year,
        source_draft.month,
        'DRAFT',
        source_draft.source,
        ${input.name},
        source_draft.warnings,
        ${input.actorUserId}
      FROM "ShiftPlanningDraft" source_draft
      WHERE source_draft.id = ${input.sourceDraftId}
        AND source_draft."cinemaId" = ${input.cinemaId}
      RETURNING
        id,
        "cinemaId",
        year,
        month,
        status,
        note,
        "createdAt",
        "updatedAt"
    `);

    const copiedDraft = copiedDraftRows[0];
    if (!copiedDraft) {
      throw new ShiftPlanningNamedDraftNotFoundError();
    }

    const itemCount = await tx.$executeRaw(Prisma.sql`
      INSERT INTO "ShiftPlanningDraftItem" (
        "cinemaId",
        "draftId",
        date,
        "monthPlanDayId",
        "scheduleTemplateId",
        "scheduleTemplateDayId",
        "templateJobFunctionId",
        "jobFunctionId",
        "userId",
        "requiredIndex",
        status,
        "plannedStartMinute",
        "plannedEndMinute",
        "startTime",
        "endTime",
        "warningCode",
        "warningMessage",
        metadata
      )
      SELECT
        source_item."cinemaId",
        ${copiedDraft.id},
        source_item.date,
        source_item."monthPlanDayId",
        source_item."scheduleTemplateId",
        source_item."scheduleTemplateDayId",
        source_item."templateJobFunctionId",
        source_item."jobFunctionId",
        source_item."userId",
        source_item."requiredIndex",
        'DRAFT',
        source_item."plannedStartMinute",
        source_item."plannedEndMinute",
        source_item."startTime",
        source_item."endTime",
        source_item."warningCode",
        source_item."warningMessage",
        source_item.metadata
      FROM "ShiftPlanningDraftItem" source_item
      WHERE source_item."draftId" = ${input.sourceDraftId}
        AND source_item."cinemaId" = ${input.cinemaId}
    `);

    if (itemCount === 0) {
      throw new EmptyShiftPlanningNamedDraftError();
    }

    return {
      ...copiedDraft,
      itemCount: Number(itemCount),
    };
  });
}
