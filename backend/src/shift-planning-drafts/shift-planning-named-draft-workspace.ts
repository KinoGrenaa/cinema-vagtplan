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

type DraftDaySnapshotClient = Pick<
  PrismaService,
  'monthPlanDay' | 'shiftPlanningDraftDay'
>;

type DraftDaySnapshotInput = {
  draftId: number;
  cinemaId: number;
  year: number;
  month: number;
};

function buildMonthDates(
  year: number,
  month: number,
) {
  const dates: Date[] = [];

  for (let day = 1; ; day += 1) {
    const date = new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    );

    if (
      date.getUTCMonth() !==
      month - 1
    ) {
      break;
    }

    dates.push(date);
  }

  return dates;
}

function draftDayDateKey(
  date: Date,
) {
  return date.toISOString();
}

async function createBlankDraftDaySnapshot(
  prisma: DraftDaySnapshotClient,
  input: DraftDaySnapshotInput,
) {
  const dates =
    buildMonthDates(
      input.year,
      input.month,
    );

  const result =
    await prisma.shiftPlanningDraftDay.createMany({
      data: dates.map(
        (date) => ({
          cinemaId:
            input.cinemaId,
          draftId:
            input.draftId,
          date,
          isActive: true,
          scheduleTemplateId:
            null,
          note: null,
        }),
      ),
    });

  return result.count;
}

async function replaceDraftDaySnapshotFromWorkspace(
  prisma: DraftDaySnapshotClient,
  input: DraftDaySnapshotInput,
) {
  const { start, end } =
    monthBounds(
      input.year,
      input.month,
    );

  const workspaceDays =
    await prisma.monthPlanDay.findMany({
      where: {
        cinemaId:
          input.cinemaId,
        date: {
          gte: start,
          lt: end,
        },
      },
      select: {
        date: true,
        isActive: true,
        scheduleTemplateId: true,
        note: true,
      },
    });

  const workspaceByDate =
    new Map(
      workspaceDays.map(
        (day) => [
          draftDayDateKey(
            day.date,
          ),
          day,
        ],
      ),
    );

  await prisma.shiftPlanningDraftDay.deleteMany({
    where: {
      draftId:
        input.draftId,
      cinemaId:
        input.cinemaId,
    },
  });

  const dates =
    buildMonthDates(
      input.year,
      input.month,
    );

  const result =
    await prisma.shiftPlanningDraftDay.createMany({
      data: dates.map(
        (date) => {
          const workspaceDay =
            workspaceByDate.get(
              draftDayDateKey(
                date,
              ),
            );

          return {
            cinemaId:
              input.cinemaId,
            draftId:
              input.draftId,
            date,
            isActive:
              workspaceDay
                ?.isActive ??
              true,
            scheduleTemplateId:
              workspaceDay
                ?.scheduleTemplateId ??
              null,
            note:
              workspaceDay
                ?.note ??
              null,
          };
        },
      ),
    });

  return result.count;
}

async function restoreDraftDaySnapshotToWorkspace(
  prisma: DraftDaySnapshotClient,
  input: Pick<
    DraftDaySnapshotInput,
    'draftId' | 'cinemaId'
  >,
) {
  const snapshotDays =
    await prisma.shiftPlanningDraftDay.findMany({
      where: {
        draftId:
          input.draftId,
        cinemaId:
          input.cinemaId,
      },
      select: {
        date: true,
        isActive: true,
        scheduleTemplateId: true,
        note: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

  for (const day of snapshotDays) {
    await prisma.monthPlanDay.upsert({
      where: {
        cinemaId_date: {
          cinemaId:
            input.cinemaId,
          date:
            day.date,
        },
      },
      update: {
        isActive:
          day.isActive,
        scheduleTemplateId:
          day.scheduleTemplateId,
        note:
          day.note,
      },
      create: {
        cinemaId:
          input.cinemaId,
        date:
          day.date,
        isActive:
          day.isActive,
        scheduleTemplateId:
          day.scheduleTemplateId,
        note:
          day.note,
      },
    });
  }

  return snapshotDays.length;
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

    await replaceDraftDaySnapshotFromWorkspace(
      tx,
      {
        draftId:
          draft.id,
        cinemaId:
          input.cinemaId,
        year:
          input.year,
        month:
          input.month,
      },
    );

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
  return prisma.$transaction(
    async (tx) => {
      const rows =
        await tx.$queryRaw<DraftRow[]>(Prisma.sql`
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

      const draft =
        rows[0];

      if (!draft) {
        throw new ShiftPlanningNamedDraftNotFoundError();
      }

      await createBlankDraftDaySnapshot(
        tx,
        {
          draftId:
            draft.id,
          cinemaId:
            draft.cinemaId,
          year:
            draft.year,
          month:
            draft.month,
        },
      );

      return {
        ...draft,
        itemCount: 0,
        warningCount: 0,
      };
    },
  );
}

export async function openNamedShiftPlanningDraftWorkspace(
  prisma: PrismaService,
  input: ExistingNamedDraftInput,
) {
  const draft =
    await findEditableDraft(
      prisma,
      input,
    );

  return prisma.$transaction(
    async (tx) => {
      const lockedRows =
        await tx.$queryRaw<DraftRow[]>(Prisma.sql`
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

      requireEditableDraft(
        lockedRows[0],
      );

      const restoredDayCount =
        await restoreDraftDaySnapshotToWorkspace(
          tx,
          {
            draftId:
              draft.id,
            cinemaId:
              draft.cinemaId,
          },
        );

      return {
        draftId:
          draft.id,
        year:
          draft.year,
        month:
          draft.month,
        restoredDayCount,
        clearedDayCount:
          restoredDayCount,
        restoredTemplateDayCount:
          restoredDayCount,
      };
    },
  );
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

    await replaceDraftDaySnapshotFromWorkspace(
      tx,
      {
        draftId:
          input.draftId,
        cinemaId:
          input.cinemaId,
        year:
          draft.year,
        month:
          draft.month,
      },
    );

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
    const copiedDraftRows =
      await tx.$queryRaw<DraftRow[]>(Prisma.sql`
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

    const copiedDraft =
      copiedDraftRows[0];

    if (!copiedDraft) {
      throw new ShiftPlanningNamedDraftNotFoundError();
    }

    const itemCount =
      await tx.$executeRaw(Prisma.sql`
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

    const sourceDays =
      await tx.shiftPlanningDraftDay.findMany({
        where: {
          draftId:
            input.sourceDraftId,
          cinemaId:
            input.cinemaId,
        },
        select: {
          date: true,
          isActive: true,
          scheduleTemplateId: true,
          note: true,
        },
        orderBy: {
          date: 'asc',
        },
      });

    if (sourceDays.length > 0) {
      await tx.shiftPlanningDraftDay.createMany({
        data: sourceDays.map(
          (day) => ({
            cinemaId:
              input.cinemaId,
            draftId:
              copiedDraft.id,
            date:
              day.date,
            isActive:
              day.isActive,
            scheduleTemplateId:
              day.scheduleTemplateId,
            note:
              day.note,
          }),
        ),
      });
    }

    return {
      ...copiedDraft,
      itemCount:
        Number(itemCount),
      dayCount:
        sourceDays.length,
    };
  });
}
