import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { PrismaService } from '../../prisma/prisma.service';
import type { PushService } from '../../push/push.service';
import type { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  buildCopenhagenDateTimeFromMinute,
  getCopenhagenDayInstantRange,
} from '../../shift-planning-drafts/shift-planning-time-zone';
import { validateDraftShiftMinutes } from '../../shift-planning-drafts/shift-planning-draft-time-validation';
import { ensureShiftUserHasCinemaAccess } from './shift-user-access';
import {
  buildPostgresIntegerArraySql,
  getSourceMovieShowingIds,
} from '../../shift-planning-drafts/shift-planning-source-movie-showing-ids';
import {
  buildPlanningShiftRemovalRange,
  type PlanningShiftRemovalRange,
  type PlanningShiftRemovalScope,
} from './shift-planning-removal';

type DraftRow = {
  id: number | bigint;
  cinemaId: number | bigint;
  year: number | bigint;
  month: number | bigint;
  status: string;
  note: string | null;
};

type DraftItemRow = {
  id: number | bigint;
  date: Date | string;
  status: string;
  scheduleTemplateId: number | bigint | null;
  scheduleTemplateDayId: number | bigint | null;
  jobFunctionId: number | bigint | null;
  userId: number | bigint | null;
  requiredIndex: number | bigint;
  plannedStartMinute: number | bigint | null;
  plannedEndMinute: number | bigint | null;
  warningCode: string | null;
  warningMessage: string | null;
  metadata: unknown;
  jobFunctionName: string | null;
  jobFunctionColor: string | null;
  jobFunctionIsActive: boolean | null;
  jobFunctionArchivedAt: Date | string | null;
  userFirstName: string | null;
  userLastName: string | null;
  userEmail: string | null;
};

type ExistingShiftRow = {
  id: number | bigint;
  startTime: Date | string;
  endTime: Date | string;
  userId: number | bigint | null;
  userFirstName: string | null;
  userLastName: string | null;
  userEmail: string | null;
  jobFunctionId: number | bigint | null;
  jobFunctionNameSnapshot: string;
  timeEntryCount: number | bigint;
  shiftTradeCount: number | bigint;
  staffingRequestCount: number | bigint;
};

type RemainingShift = {
  id: number;
  jobFunctionId: number | null;
  userId: number | null;
  startTime: Date;
  endTime: Date;
};

type AuthUser = {
  sub?: number;
  id?: number;
};

type InsertedShiftRow = {
  id: number | bigint;
};

export const PLANNING_SHIFT_REPLACEMENT_CONFIRMATION_TEXT = 'ERSTAT VAGTER';

export type PlanningShiftReplacementExistingItem = {
  shiftId: number;
  dateKey: string;
  startTime: Date;
  endTime: Date;
  userId: number | null;
  userName: string | null;
  jobFunctionId: number | null;
  jobFunctionName: string;
  canRemove: boolean;
  blockReasons: string[];
};

export type PlanningShiftReplacementProposedItem = {
  draftItemId: number;
  dateKey: string;
  startTime: Date | null;
  endTime: Date | null;
  userId: number | null;
  userName: string | null;
  jobFunctionId: number | null;
  jobFunctionName: string | null;
  jobFunctionColor: string | null;
  requiredIndex: number;
  sourceMovieShowingIds: number[];
  canCreate: boolean;
  blockReasons: string[];
};

export type PlanningShiftReplacementRange = PlanningShiftRemovalRange & {
  draftYear: number;
  draftMonth: number;
};

export type PlanningShiftReplacementPreview = {
  mode: 'PREVIEW_ONLY';
  createsOrChangesShifts: false;
  cinemaId: number;
  draftId: number;
  draftName: string | null;
  scope: PlanningShiftRemovalScope;
  requestedDateKey: string;
  startDateKey: string;
  endDateKey: string;
  checkedAt: Date;
  summary: {
    existingShiftCount: number;
    removableShiftCount: number;
    blockedExistingShiftCount: number;
    assignedExistingShiftCount: number;
    retainedExistingShiftCount: number;
    proposedShiftCount: number;
    creatableShiftCount: number;
    blockedProposedShiftCount: number;
    ignoredPastProposedShiftCount: number;
    affectedDateCount: number;
    canReplace: boolean;
  };
  blockingReasons: string[];
  existingItems: PlanningShiftReplacementExistingItem[];
  proposedItems: PlanningShiftReplacementProposedItem[];
};

function toNumber(value: number | bigint | null | undefined) {
  if (value === null || value === undefined) return null;
  const normalized = Number(value);
  return Number.isInteger(normalized) ? normalized : null;
}

function toRequiredNumber(value: number | bigint) {
  return Number(value);
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function dateKeyToUtcDate(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    throw new BadRequestException('Dato skal angives som ÅÅÅÅ-MM-DD.');
  }
  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
}

function toDateKey(value: Date | string) {
  return toDate(value).toISOString().slice(0, 10);
}

function monthStartDateKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function nextMonthDateKey(year: number, month: number) {
  const date = new Date(Date.UTC(year, month, 1));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function addDays(dateKey: string, days: number) {
  const date = dateKeyToUtcDate(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function getUserName(row: {
  userFirstName: string | null;
  userLastName: string | null;
  userEmail: string | null;
}) {
  const name = `${row.userFirstName ?? ''} ${row.userLastName ?? ''}`.trim();
  return name || row.userEmail || null;
}

function unique(messages: string[]) {
  return Array.from(new Set(messages.filter(Boolean)));
}

function rangesOverlap(
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date,
) {
  return firstStart < secondEnd && firstEnd > secondStart;
}

export function buildPlanningShiftReplacementRange(
  scopeValue: unknown,
  dateKeyValue: unknown,
  draftYear: number,
  draftMonth: number,
): PlanningShiftReplacementRange {
  const requested = buildPlanningShiftRemovalRange(scopeValue, dateKeyValue);
  const draftStartDateKey = monthStartDateKey(draftYear, draftMonth);
  const draftEndExclusiveDateKey = nextMonthDateKey(draftYear, draftMonth);

  const startDateKey =
    requested.startDateKey > draftStartDateKey
      ? requested.startDateKey
      : draftStartDateKey;
  const endExclusiveDateKey =
    requested.endExclusiveDateKey < draftEndExclusiveDateKey
      ? requested.endExclusiveDateKey
      : draftEndExclusiveDateKey;

  if (startDateKey >= endExclusiveDateKey) {
    throw new BadRequestException(
      'Den valgte periode ligger uden for kladdens måned.',
    );
  }

  const endDateKey = addDays(endExclusiveDateKey, -1);

  return {
    ...requested,
    startDateKey,
    endDateKey,
    endExclusiveDateKey,
    start: getCopenhagenDayInstantRange(startDateKey).start,
    end: getCopenhagenDayInstantRange(endExclusiveDateKey).start,
    draftYear,
    draftMonth,
  };
}

function buildExistingItem(
  row: ExistingShiftRow,
  _now: Date,
): PlanningShiftReplacementExistingItem {
  const startTime = toDate(row.startTime);
  const endTime = toDate(row.endTime);
  const blockReasons: string[] = [];

  if (Number(row.timeEntryCount) > 0) {
    blockReasons.push('Vagten har tidsregistrering og kan ikke erstattes her.');
  }
  if (Number(row.shiftTradeCount) > 0) {
    blockReasons.push('Vagten indgår i en vagtbytteanmodning.');
  }
  if (Number(row.staffingRequestCount) > 0) {
    blockReasons.push('Vagten indgår i en bemandingsforespørgsel.');
  }

  return {
    shiftId: toRequiredNumber(row.id),
    dateKey: new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Copenhagen',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(startTime),
    startTime,
    endTime,
    userId: toNumber(row.userId),
    userName: getUserName(row),
    jobFunctionId: toNumber(row.jobFunctionId),
    jobFunctionName: row.jobFunctionNameSnapshot,
    canRemove: blockReasons.length === 0,
    blockReasons: unique(blockReasons),
  };
}

function normalizeDraftItem(
  row: DraftItemRow,
  _now: Date,
): PlanningShiftReplacementProposedItem {
  const date = toDate(row.date);
  const dateKey = toDateKey(date);
  const plannedStartMinute = toNumber(row.plannedStartMinute);
  const plannedEndMinute = toNumber(row.plannedEndMinute);
  const blockReasons: string[] = [];

  if (!row.scheduleTemplateId || !row.scheduleTemplateDayId) {
    blockReasons.push('Mangler vagtsskabelon eller ugedag.');
  }
  if (!row.jobFunctionId) {
    blockReasons.push('Jobfunktion mangler.');
  }
  if (row.jobFunctionIsActive === false || row.jobFunctionArchivedAt) {
    blockReasons.push(
      `${row.jobFunctionName ?? 'Jobfunktionen'} er arkiveret eller inaktiv.`,
    );
  }
  if (row.warningMessage) {
    blockReasons.push(row.warningMessage);
  }

  let startTime: Date | null = null;
  let endTime: Date | null = null;

  if (plannedStartMinute === null || plannedEndMinute === null) {
    blockReasons.push('Mangler mødetid eller fyraften.');
  } else {
    const validation = validateDraftShiftMinutes(
      plannedStartMinute,
      plannedEndMinute,
    );
    if (validation.message) {
      blockReasons.push(validation.message);
    }
    if (validation.normalizedEndMinute !== null) {
      startTime = buildCopenhagenDateTimeFromMinute(date, plannedStartMinute);
      endTime = buildCopenhagenDateTimeFromMinute(
        date,
        validation.normalizedEndMinute,
      );
    }
  }

  if (!startTime || !endTime) {
    blockReasons.push('Vagten mangler et gyldigt start- eller sluttidspunkt.');
  }

  return {
    draftItemId: toRequiredNumber(row.id),
    dateKey,
    startTime,
    endTime,
    userId: toNumber(row.userId),
    userName: getUserName(row),
    jobFunctionId: toNumber(row.jobFunctionId),
    jobFunctionName: row.jobFunctionName,
    jobFunctionColor: row.jobFunctionColor,
    requiredIndex: toRequiredNumber(row.requiredIndex),
    sourceMovieShowingIds: getSourceMovieShowingIds(row.metadata),
    canCreate: blockReasons.length === 0,
    blockReasons: unique(blockReasons),
  };
}

function addProposedBlockReason(
  item: PlanningShiftReplacementProposedItem,
  reason: string,
) {
  item.blockReasons = unique([...item.blockReasons, reason]);
  item.canCreate = false;
}


export function partitionPlanningShiftReplacementByNow(
  existingItems: PlanningShiftReplacementExistingItem[],
  proposedItems: PlanningShiftReplacementProposedItem[],
  now: Date,
) {
  const todayDateKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const retainedExistingItems = existingItems.filter(
    (item) => item.startTime.getTime() <= now.getTime(),
  );
  const actionableExistingItems = existingItems.filter(
    (item) => item.startTime.getTime() > now.getTime(),
  );

  const isPastProposedItem = (item: PlanningShiftReplacementProposedItem) => {
    if (item.startTime) {
      return item.startTime.getTime() <= now.getTime();
    }
    return item.dateKey < todayDateKey;
  };

  const ignoredPastProposedItems = proposedItems.filter(isPastProposedItem);
  const actionableProposedItems = proposedItems.filter(
    (item) => !isPastProposedItem(item),
  );

  return {
    actionableExistingItems,
    retainedExistingItems,
    actionableProposedItems,
    ignoredPastProposedItems,
  };
}

export function buildPlanningShiftReplacementPreviewFromItems(
  cinemaId: number,
  draftId: number,
  draftName: string | null,
  range: PlanningShiftReplacementRange,
  existingItems: PlanningShiftReplacementExistingItem[],
  proposedItems: PlanningShiftReplacementProposedItem[],
  checkedAt = new Date(),
  retainedPast: {
    retainedExistingShiftCount?: number;
    ignoredPastProposedShiftCount?: number;
  } = {},
): PlanningShiftReplacementPreview {
  const blockedExisting = existingItems.filter((item) => !item.canRemove);
  const blockedProposed = proposedItems.filter((item) => !item.canCreate);
  const blockingReasons = unique([
    ...(existingItems.length === 0
      ? ['Der er ingen fremtidige planlægningsoprettede vagter at erstatte i perioden.']
      : []),
    ...blockedExisting.flatMap((item) => item.blockReasons),
    ...blockedProposed.flatMap((item) => item.blockReasons),
  ]);
  const affectedDateKeys = unique([
    ...existingItems.map((item) => item.dateKey),
    ...proposedItems.map((item) => item.dateKey),
  ]).sort();

  return {
    mode: 'PREVIEW_ONLY',
    createsOrChangesShifts: false,
    cinemaId,
    draftId,
    draftName,
    scope: range.scope,
    requestedDateKey: range.requestedDateKey,
    startDateKey: range.startDateKey,
    endDateKey: range.endDateKey,
    checkedAt,
    summary: {
      existingShiftCount: existingItems.length,
      removableShiftCount: existingItems.filter((item) => item.canRemove).length,
      blockedExistingShiftCount: blockedExisting.length,
      assignedExistingShiftCount: existingItems.filter(
        (item) => item.userId !== null,
      ).length,
      retainedExistingShiftCount:
        retainedPast.retainedExistingShiftCount ?? 0,
      proposedShiftCount: proposedItems.length,
      creatableShiftCount: proposedItems.filter((item) => item.canCreate).length,
      blockedProposedShiftCount: blockedProposed.length,
      ignoredPastProposedShiftCount:
        retainedPast.ignoredPastProposedShiftCount ?? 0,
      affectedDateCount: affectedDateKeys.length,
      canReplace:
        existingItems.length > 0 &&
        blockedExisting.length === 0 &&
        blockedProposed.length === 0,
    },
    blockingReasons,
    existingItems,
    proposedItems,
  };
}

async function findDraft(
  prisma: PrismaService,
  cinemaId: number,
  draftId: number,
) {
  const rows = await prisma.$queryRaw<DraftRow[]>(Prisma.sql`
    SELECT
      id,
      "cinemaId",
      year,
      month,
      status,
      note
    FROM "ShiftPlanningDraft"
    WHERE id = ${draftId}
      AND "cinemaId" = ${cinemaId}
    LIMIT 1
  `);

  if (!rows[0]) {
    throw new NotFoundException('Planlægningskladden findes ikke.');
  }
  if (String(rows[0].status ?? '').toUpperCase() !== 'DRAFT') {
    throw new BadRequestException('Kun en åben kladde kan bruges til erstatning.');
  }

  return rows[0];
}

async function findDraftItems(
  prisma: PrismaService,
  cinemaId: number,
  draftId: number,
  range: PlanningShiftReplacementRange,
) {
  const dateStart = dateKeyToUtcDate(range.startDateKey);
  const dateEnd = dateKeyToUtcDate(range.endExclusiveDateKey);

  return prisma.$queryRaw<DraftItemRow[]>(Prisma.sql`
    SELECT
      i.id,
      i.date,
      i.status,
      i."scheduleTemplateId",
      i."scheduleTemplateDayId",
      i."jobFunctionId",
      i."userId",
      i."requiredIndex",
      i."plannedStartMinute",
      i."plannedEndMinute",
      i."warningCode",
      i."warningMessage",
      i.metadata,
      jf.name AS "jobFunctionName",
      jf.color AS "jobFunctionColor",
      jf."isActive" AS "jobFunctionIsActive",
      jf."archivedAt" AS "jobFunctionArchivedAt",
      u."firstName" AS "userFirstName",
      u."lastName" AS "userLastName",
      u.email AS "userEmail"
    FROM "ShiftPlanningDraftItem" i
    LEFT JOIN "JobFunction" jf
      ON jf.id = i."jobFunctionId"
      AND jf."cinemaId" = i."cinemaId"
    LEFT JOIN "User" u ON u.id = i."userId"
    WHERE i."draftId" = ${draftId}
      AND i."cinemaId" = ${cinemaId}
      AND i.date >= ${dateStart}
      AND i.date < ${dateEnd}
    ORDER BY
      i.date ASC,
      i."plannedStartMinute" ASC NULLS LAST,
      i.id ASC
  `);
}

async function findExistingReplacementRows(
  prisma: PrismaService,
  cinemaId: number,
  range: PlanningShiftReplacementRange,
  lockRows = false,
) {
  const baseSql = Prisma.sql`
    SELECT
      s.id,
      s."startTime",
      s."endTime",
      s."userId",
      u."firstName" AS "userFirstName",
      u."lastName" AS "userLastName",
      u.email AS "userEmail",
      s."jobFunctionId",
      s."jobFunctionNameSnapshot",
      (
        SELECT CAST(COUNT(*) AS INTEGER)
        FROM "TimeEntry" te
        WHERE te."shiftId" = s.id
      ) AS "timeEntryCount",
      (
        SELECT CAST(COUNT(*) AS INTEGER)
        FROM "ShiftTrade" st
        WHERE st."shiftId" = s.id
      ) AS "shiftTradeCount",
      (
        SELECT CAST(COUNT(*) AS INTEGER)
        FROM "StaffingRequest" sr
        WHERE sr."shiftId" = s.id
      ) AS "staffingRequestCount"
    FROM "Shift" s
    LEFT JOIN "User" u ON u.id = s."userId"
    WHERE s."cinemaId" = ${cinemaId}
      AND s."startTime" >= ${range.start}
      AND s."startTime" < ${range.end}
      AND COALESCE(s."timingRuleSnapshot" ->> 'source', '') = 'SHIFT_PLANNING_DRAFT'
    ORDER BY s."startTime" ASC, s.id ASC
  `;

  if (lockRows) {
    return prisma.$queryRaw<ExistingShiftRow[]>(Prisma.sql`
      ${baseSql}
      FOR UPDATE OF s
    `);
  }

  return prisma.$queryRaw<ExistingShiftRow[]>(baseSql);
}

async function applyUserAndRemainingShiftSafety(
  prisma: PrismaService,
  cinemaId: number,
  proposedItems: PlanningShiftReplacementProposedItem[],
  existingItems: PlanningShiftReplacementExistingItem[],
) {
  const validTimes = proposedItems.filter(
    (item) => item.startTime && item.endTime,
  );
  const candidateIds = new Set(existingItems.map((item) => item.shiftId));

  let remainingShifts: RemainingShift[] = [];
  if (validTimes.length > 0) {
    const start = new Date(
      Math.min(...validTimes.map((item) => (item.startTime as Date).getTime())),
    );
    const end = new Date(
      Math.max(...validTimes.map((item) => (item.endTime as Date).getTime())),
    );
    const rows = await prisma.shift.findMany({
      where: {
        cinemaId,
        startTime: { lt: end },
        endTime: { gt: start },
      },
      select: {
        id: true,
        jobFunctionId: true,
        userId: true,
        startTime: true,
        endTime: true,
      },
      orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
    });

    remainingShifts = rows
      .filter((shift) => !candidateIds.has(shift.id))
      .map((shift) => ({
        id: shift.id,
        jobFunctionId: shift.jobFunctionId,
        userId: shift.userId,
        startTime: shift.startTime,
        endTime: shift.endTime,
      }));
  }

  for (const item of proposedItems) {
    if (
      !item.canCreate ||
      !item.startTime ||
      !item.endTime ||
      item.jobFunctionId === null
    ) {
      continue;
    }

    const duplicateRemainingShift = remainingShifts.some(
      (shift) =>
        shift.jobFunctionId === item.jobFunctionId &&
        shift.startTime.getTime() === item.startTime!.getTime() &&
        shift.endTime.getTime() === item.endTime!.getTime(),
    );
    if (duplicateRemainingShift) {
      addProposedBlockReason(
        item,
        'Der findes allerede en tilsvarende vagt, som ikke fjernes ved erstatningen.',
      );
    }

    if (item.userId !== null) {
      try {
        await ensureShiftUserHasCinemaAccess(prisma, item.userId, cinemaId);
      } catch (error) {
        addProposedBlockReason(
          item,
          error instanceof Error && error.message.trim()
            ? error.message
            : 'Medarbejderen kan ikke tildeles denne vagt.',
        );
      }

      const qualification = await prisma.userJobFunction.findFirst({
        where: {
          cinemaId,
          userId: item.userId,
          jobFunctionId: item.jobFunctionId,
        },
        select: { id: true },
      });
      if (!qualification) {
        addProposedBlockReason(
          item,
          'Medarbejderen er ikke kvalificeret til jobfunktionen.',
        );
      }

      const overlappingRemainingShift = remainingShifts.some(
        (shift) =>
          shift.userId === item.userId &&
          rangesOverlap(
            item.startTime as Date,
            item.endTime as Date,
            shift.startTime,
            shift.endTime,
          ),
      );
      if (overlappingRemainingShift) {
        addProposedBlockReason(
          item,
          'Medarbejderen har en overlappende vagt, som ikke fjernes ved erstatningen.',
        );
      }
    }
  }

  for (let firstIndex = 0; firstIndex < proposedItems.length; firstIndex += 1) {
    const first = proposedItems[firstIndex];
    if (
      !first.canCreate ||
      first.userId === null ||
      !first.startTime ||
      !first.endTime
    ) {
      continue;
    }

    for (
      let secondIndex = firstIndex + 1;
      secondIndex < proposedItems.length;
      secondIndex += 1
    ) {
      const second = proposedItems[secondIndex];
      if (
        !second.canCreate ||
        second.userId !== first.userId ||
        !second.startTime ||
        !second.endTime
      ) {
        continue;
      }

      if (
        rangesOverlap(
          first.startTime,
          first.endTime,
          second.startTime,
          second.endTime,
        )
      ) {
        addProposedBlockReason(
          first,
          'Samme medarbejder er foreslået i overlappende vagter.',
        );
        addProposedBlockReason(
          second,
          'Samme medarbejder er foreslået i overlappende vagter.',
        );
      }
    }
  }
}


export function assertPlanningShiftReplacementConfirmation(value: unknown) {
  if (
    String(value ?? '').trim() !==
    PLANNING_SHIFT_REPLACEMENT_CONFIRMATION_TEXT
  ) {
    throw new BadRequestException(
      'Bekræft erstatningen, før vagtplanen ændres.',
    );
  }
}

export function assertPlanningShiftReplacementCanExecute(
  preview: PlanningShiftReplacementPreview,
) {
  if (!preview.summary.canReplace) {
    throw new BadRequestException(
      preview.blockingReasons[0] ??
        'En eller flere vagter kan ikke erstattes sikkert.',
    );
  }
}

function isSerializableTransactionConflict(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2034'
  );
}

async function refreshMonthPlanCountsForDateKeys(
  prisma: PrismaService,
  cinemaId: number,
  dateKeys: string[],
) {
  for (const dateKey of dateKeys) {
    const { start, end } = getCopenhagenDayInstantRange(dateKey);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "MonthPlanDay"
      SET "plannedShiftCount" = (
        SELECT CAST(COUNT(*) AS INTEGER)
        FROM "Shift" s
        WHERE s."cinemaId" = ${cinemaId}
          AND s."startTime" >= ${start}
          AND s."startTime" < ${end}
      ),
      "unassignedShiftCount" = (
        SELECT CAST(COUNT(*) AS INTEGER)
        FROM "Shift" s
        WHERE s."cinemaId" = ${cinemaId}
          AND s."startTime" >= ${start}
          AND s."startTime" < ${end}
          AND s."userId" IS NULL
      ),
      "updatedAt" = CURRENT_TIMESTAMP
      WHERE "cinemaId" = ${cinemaId}
        AND "date" >= ${start}
        AND "date" < ${end}
    `);
  }
}

function buildReplacementAuditDescription(
  draftId: number,
  range: PlanningShiftReplacementRange,
  removedShiftIds: number[],
  createdShiftIds: number[],
) {
  return (
    `Erstattede ${removedShiftIds.length} planlægningsvagt(er) med ` +
    `${createdShiftIds.length} vagt(er) fra kladde #${draftId} ` +
    `i perioden ${range.startDateKey} til ${range.endDateKey}. ` +
    `Fjernede shift-id'er: ${removedShiftIds.join(', ') || 'ingen'}. ` +
    `Oprettede shift-id'er: ${createdShiftIds.join(', ') || 'ingen'}.`
  );
}

export async function previewPlanningShiftReplacement(
  prisma: PrismaService,
  input: {
    cinemaId: number;
    draftId: number;
    scope: unknown;
    dateKey: unknown;
    now?: Date;
  },
) {
  const draft = await findDraft(prisma, input.cinemaId, input.draftId);
  const draftYear = Number(draft.year);
  const draftMonth = Number(draft.month);
  const range = buildPlanningShiftReplacementRange(
    input.scope,
    input.dateKey,
    draftYear,
    draftMonth,
  );
  const now = input.now ?? new Date();

  const [draftRows, existingRows] = await Promise.all([
    findDraftItems(prisma, input.cinemaId, input.draftId, range),
    findExistingReplacementRows(prisma, input.cinemaId, range),
  ]);

  const normalizedExistingItems = existingRows.map((row) =>
    buildExistingItem(row, now),
  );
  const normalizedProposedItems = draftRows.map((row) =>
    normalizeDraftItem(row, now),
  );
  const {
    actionableExistingItems,
    retainedExistingItems,
    actionableProposedItems,
    ignoredPastProposedItems,
  } = partitionPlanningShiftReplacementByNow(
    normalizedExistingItems,
    normalizedProposedItems,
    now,
  );

  await applyUserAndRemainingShiftSafety(
    prisma,
    input.cinemaId,
    actionableProposedItems,
    actionableExistingItems,
  );

  return buildPlanningShiftReplacementPreviewFromItems(
    input.cinemaId,
    input.draftId,
    draft.note,
    range,
    actionableExistingItems,
    actionableProposedItems,
    now,
    {
      retainedExistingShiftCount: retainedExistingItems.length,
      ignoredPastProposedShiftCount: ignoredPastProposedItems.length,
    },
  );
}

export async function replacePlanningShifts(
  dependencies: {
    prisma: PrismaService;
    realtimeGateway: RealtimeGateway;
    pushService: PushService;
  },
  user: AuthUser,
  input: {
    cinemaId: number;
    draftId: number;
    scope: unknown;
    dateKey: unknown;
    confirmationText: unknown;
    now?: Date;
  },
) {
  assertPlanningShiftReplacementConfirmation(input.confirmationText);

  const draft = await findDraft(
    dependencies.prisma,
    input.cinemaId,
    input.draftId,
  );
  const range = buildPlanningShiftReplacementRange(
    input.scope,
    input.dateKey,
    Number(draft.year),
    Number(draft.month),
  );
  const now = input.now ?? new Date();
  const actorUserId = Number(user.sub ?? user.id);

  const result = await dependencies.prisma
    .$transaction(
      async (tx) => {
        const lockedDraftRows = await tx.$queryRaw<DraftRow[]>(Prisma.sql`
          SELECT
            id,
            "cinemaId",
            year,
            month,
            status,
            note
          FROM "ShiftPlanningDraft"
          WHERE id = ${input.draftId}
            AND "cinemaId" = ${input.cinemaId}
          FOR UPDATE
        `);

        if (lockedDraftRows.length === 0) {
          throw new NotFoundException('Planlægningskladden findes ikke.');
        }
        if (
          String(lockedDraftRows[0].status ?? '').toUpperCase() !== 'DRAFT'
        ) {
          throw new BadRequestException(
            'Kun en åben kladde kan bruges til erstatning.',
          );
        }

        const lockedRange = buildPlanningShiftReplacementRange(
          input.scope,
          input.dateKey,
          Number(lockedDraftRows[0].year),
          Number(lockedDraftRows[0].month),
        );

        const [draftRows, existingRows] = await Promise.all([
          findDraftItems(
            tx as unknown as PrismaService,
            input.cinemaId,
            input.draftId,
            lockedRange,
          ),
          findExistingReplacementRows(
            tx as unknown as PrismaService,
            input.cinemaId,
            lockedRange,
            true,
          ),
        ]);

        const normalizedExistingItems = existingRows.map((row) =>
          buildExistingItem(row, now),
        );
        const normalizedProposedItems = draftRows.map((row) =>
          normalizeDraftItem(row, now),
        );
        const {
          actionableExistingItems,
          retainedExistingItems,
          actionableProposedItems,
          ignoredPastProposedItems,
        } = partitionPlanningShiftReplacementByNow(
          normalizedExistingItems,
          normalizedProposedItems,
          now,
        );

        await applyUserAndRemainingShiftSafety(
          tx as unknown as PrismaService,
          input.cinemaId,
          actionableProposedItems,
          actionableExistingItems,
        );

        const preview = buildPlanningShiftReplacementPreviewFromItems(
          input.cinemaId,
          input.draftId,
          lockedDraftRows[0].note,
          lockedRange,
          actionableExistingItems,
          actionableProposedItems,
          now,
          {
            retainedExistingShiftCount: retainedExistingItems.length,
            ignoredPastProposedShiftCount: ignoredPastProposedItems.length,
          },
        );
        assertPlanningShiftReplacementCanExecute(preview);

        const removedShiftIds = preview.existingItems.map(
          (item) => item.shiftId,
        );
        const deletedRows = await tx.$queryRaw<
          Array<{ id: number | bigint }>
        >(Prisma.sql`
          DELETE FROM "Shift"
          WHERE "cinemaId" = ${input.cinemaId}
            AND id IN (${Prisma.join(removedShiftIds)})
            AND COALESCE("timingRuleSnapshot" ->> 'source', '') = 'SHIFT_PLANNING_DRAFT'
          RETURNING id
        `);

        if (deletedRows.length !== removedShiftIds.length) {
          throw new BadRequestException(
            'Vagtplanen blev ændret under erstatningen. Ingen delvis ændring er godkendt.',
          );
        }

        const createdShiftIds: number[] = [];
        for (const item of preview.proposedItems) {
          if (
            !item.canCreate ||
            !item.startTime ||
            !item.endTime ||
            item.jobFunctionId === null
          ) {
            throw new BadRequestException(
              item.blockReasons[0] ??
                'Et af de nye vagtforslag kan ikke oprettes sikkert.',
            );
          }

          const sourceMovieShowingIdsSql = buildPostgresIntegerArraySql(
            item.sourceMovieShowingIds,
          );
          const insertedRows = await tx.$queryRaw<InsertedShiftRow[]>(
            Prisma.sql`
              INSERT INTO "Shift" (
                "cinemaId",
                "userId",
                "workTypeId",
                "jobFunctionId",
                "jobFunctionNameSnapshot",
                "jobFunctionColorSnapshot",
                "timingSource",
                "timingRuleSnapshot",
                "sourceMovieShowingIds",
                "startTime",
                "endTime",
                note
              )
              VALUES (
                ${input.cinemaId},
                ${item.userId},
                NULL,
                ${item.jobFunctionId},
                ${item.jobFunctionName},
                ${item.jobFunctionColor},
                'JOB_FUNCTION_RULE',
                CAST(${JSON.stringify({
                  source: 'SHIFT_PLANNING_DRAFT',
                  draftId: input.draftId,
                  draftItemId: item.draftItemId,
                  replacement: true,
                })} AS jsonb),
                ${sourceMovieShowingIdsSql},
                ${item.startTime},
                ${item.endTime},
                NULL
              )
              RETURNING id
            `,
          );

          const createdShiftId = toNumber(insertedRows[0]?.id);
          if (createdShiftId === null) {
            throw new BadRequestException(
              'En ny vagt kunne ikke oprettes. Hele erstatningen er annulleret.',
            );
          }
          createdShiftIds.push(createdShiftId);
        }

        if (createdShiftIds.length !== preview.proposedItems.length) {
          throw new BadRequestException(
            'Ikke alle nye vagter blev oprettet. Hele erstatningen er annulleret.',
          );
        }

        const affectedDateKeys = unique([
          ...preview.existingItems.map((item) => item.dateKey),
          ...preview.proposedItems.map((item) => item.dateKey),
        ]).sort();

        await refreshMonthPlanCountsForDateKeys(
          tx as unknown as PrismaService,
          input.cinemaId,
          affectedDateKeys,
        );

        if (Number.isInteger(actorUserId) && actorUserId > 0) {
          await tx.$executeRaw(Prisma.sql`
            INSERT INTO "AuditLog" (
              action,
              "entityType",
              "entityId",
              description,
              "createdAt",
              "userId",
              "cinemaId"
            )
            VALUES (
              'BULK_REPLACE_PLANNED_SHIFTS',
              'Shift',
              NULL,
              ${buildReplacementAuditDescription(
                input.draftId,
                lockedRange,
                removedShiftIds,
                createdShiftIds,
              )},
              CURRENT_TIMESTAMP,
              ${actorUserId},
              ${input.cinemaId}
            )
          `);
        }

        return {
          preview,
          removedShiftIds,
          createdShiftIds,
          affectedDateKeys,
          assignedUserIds: Array.from(
            new Set(
              [
                ...preview.existingItems.map((item) => item.userId),
                ...preview.proposedItems.map((item) => item.userId),
              ].filter((userId): userId is number => userId !== null),
            ),
          ),
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    )
    .catch((error) => {
      if (isSerializableTransactionConflict(error)) {
        throw new BadRequestException(
          'Vagtplanen eller kladden blev ændret under erstatningen. Kontrollér forslaget igen.',
        );
      }
      throw error;
    });

  dependencies.realtimeGateway.notifyCinema(input.cinemaId, 'shiftsUpdated', {
    cinemaId: input.cinemaId,
    source: 'SHIFT_PLANNING_REPLACEMENT',
    draftId: input.draftId,
    removedShiftCount: result.removedShiftIds.length,
    removedShiftIds: result.removedShiftIds,
    createdShiftCount: result.createdShiftIds.length,
    createdShiftIds: result.createdShiftIds,
    affectedDateKeys: result.affectedDateKeys,
  });

  await Promise.allSettled(
    result.assignedUserIds.map((userId) =>
      dependencies.pushService.sendToUserInCinema(userId, input.cinemaId, {
        title: 'Vagtplanen er ændret',
        body:
          `Vagter er blevet erstattet i perioden ` +
          `${range.startDateKey}–${range.endDateKey}.`,
        url: '/my-shifts',
      }),
    ),
  );

  return {
    scope: range.scope,
    draftId: input.draftId,
    startDateKey: range.startDateKey,
    endDateKey: range.endDateKey,
    removedShiftCount: result.removedShiftIds.length,
    removedShiftIds: result.removedShiftIds,
    createdShiftCount: result.createdShiftIds.length,
    createdShiftIds: result.createdShiftIds,
    affectedDateKeys: result.affectedDateKeys,
    assignedUserCount: result.assignedUserIds.length,
  };
}
