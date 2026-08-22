import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { PrismaService } from '../../prisma/prisma.service';
import type { PushService } from '../../push/push.service';
import type { RealtimeGateway } from '../../realtime/realtime.gateway';
import { getCopenhagenDayInstantRange } from '../../shift-planning-drafts/shift-planning-time-zone';

export const PLANNING_SHIFT_REMOVAL_CONFIRMATION_TEXT = 'FJERN VAGTER';

export type PlanningShiftRemovalScope = 'DAY' | 'WEEK' | 'MONTH';

type AuthUser = {
  sub?: number;
  id?: number;
};

type PlanningShiftRemovalRow = {
  id: number | bigint;
  startTime: Date | string;
  endTime: Date | string;
  userId: number | bigint | null;
  userFirstName: string | null;
  userLastName: string | null;
  userEmail: string | null;
  jobFunctionNameSnapshot: string;
  timeEntryCount: number | bigint;
  shiftTradeCount: number | bigint;
  staffingRequestCount: number | bigint;
};

type PlanningShiftRemovalDb = Pick<
  PrismaService,
  '$queryRaw' | '$executeRaw'
>;

type PlanningShiftRemovalTransactionDb = PlanningShiftRemovalDb;

export type PlanningShiftRemovalRange = {
  scope: PlanningShiftRemovalScope;
  requestedDateKey: string;
  startDateKey: string;
  endDateKey: string;
  endExclusiveDateKey: string;
  start: Date;
  end: Date;
};

export type PlanningShiftRemovalPreviewItem = {
  shiftId: number;
  dateKey: string;
  startTime: Date;
  endTime: Date;
  userId: number | null;
  userName: string | null;
  jobFunctionName: string;
  canDelete: boolean;
  blockReasons: string[];
};

export type PlanningShiftRemovalPreview = {
  mode: 'PREVIEW_ONLY';
  createsOrChangesShifts: false;
  cinemaId: number;
  scope: PlanningShiftRemovalScope;
  requestedDateKey: string;
  startDateKey: string;
  endDateKey: string;
  checkedAt: Date;
  summary: {
    selectedShiftCount: number;
    deletableShiftCount: number;
    blockedShiftCount: number;
    assignedShiftCount: number;
    affectedDateCount: number;
    canRemove: boolean;
  };
  blockingReasons: string[];
  items: PlanningShiftRemovalPreviewItem[];
};

function toRequiredNumber(value: number | bigint) {
  return Number(value);
}

function toNullableNumber(value: number | bigint | null) {
  return value === null ? null : Number(value);
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function parseDateKeyParts(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    throw new BadRequestException('Dato skal angives som ÅÅÅÅ-MM-DD.');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    throw new BadRequestException('Datoen findes ikke.');
  }

  return { year, month, day, utcDate };
}

function toDateKey(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function addDays(dateKey: string, days: number) {
  const { utcDate } = parseDateKeyParts(dateKey);
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return toDateKey(utcDate);
}

function getCopenhagenDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get('year')}-${values.get('month')}-${values.get('day')}`;
}

function getUserName(row: PlanningShiftRemovalRow) {
  const fullName = `${row.userFirstName ?? ''} ${row.userLastName ?? ''}`.trim();
  return fullName || row.userEmail || null;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function parsePlanningShiftRemovalScope(
  value: unknown,
): PlanningShiftRemovalScope {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'DAY' || normalized === 'WEEK' || normalized === 'MONTH') {
    return normalized;
  }

  throw new BadRequestException('Vælg dag, uge eller måned.');
}

export function parsePlanningShiftRemovalDateKey(value: unknown) {
  const dateKey = String(value ?? '').trim();
  parseDateKeyParts(dateKey);
  return dateKey;
}

export function buildPlanningShiftRemovalRange(
  scopeValue: unknown,
  dateKeyValue: unknown,
): PlanningShiftRemovalRange {
  const scope = parsePlanningShiftRemovalScope(scopeValue);
  const requestedDateKey = parsePlanningShiftRemovalDateKey(dateKeyValue);
  const requested = parseDateKeyParts(requestedDateKey);

  let startDateKey = requestedDateKey;
  let endExclusiveDateKey = addDays(requestedDateKey, 1);

  if (scope === 'WEEK') {
    const weekdayFromMonday = (requested.utcDate.getUTCDay() + 6) % 7;
    startDateKey = addDays(requestedDateKey, -weekdayFromMonday);
    endExclusiveDateKey = addDays(startDateKey, 7);
  }

  if (scope === 'MONTH') {
    startDateKey = `${requested.year}-${String(requested.month).padStart(2, '0')}-01`;
    const nextMonth = new Date(Date.UTC(requested.year, requested.month, 1));
    endExclusiveDateKey = toDateKey(nextMonth);
  }

  const endDateKey = addDays(endExclusiveDateKey, -1);
  const start = getCopenhagenDayInstantRange(startDateKey).start;
  const end = getCopenhagenDayInstantRange(endExclusiveDateKey).start;

  return {
    scope,
    requestedDateKey,
    startDateKey,
    endDateKey,
    endExclusiveDateKey,
    start,
    end,
  };
}

function buildBlockReasons(row: PlanningShiftRemovalRow, now: Date) {
  const reasons: string[] = [];
  const startTime = toDate(row.startTime);

  if (startTime.getTime() <= now.getTime()) {
    reasons.push('Vagten er startet eller ligger i fortiden.');
  }
  if (Number(row.timeEntryCount) > 0) {
    reasons.push('Vagten har tidsregistrering og kan ikke fjernes her.');
  }
  if (Number(row.shiftTradeCount) > 0) {
    reasons.push('Vagten indgår i en vagtbytteanmodning.');
  }
  if (Number(row.staffingRequestCount) > 0) {
    reasons.push('Vagten indgår i en bemandingsforespørgsel.');
  }

  return unique(reasons);
}

export function buildPlanningShiftRemovalPreviewFromRows(
  cinemaId: number,
  range: PlanningShiftRemovalRange,
  rows: PlanningShiftRemovalRow[],
  now = new Date(),
): PlanningShiftRemovalPreview {
  const items = rows.map((row) => {
    const startTime = toDate(row.startTime);
    const endTime = toDate(row.endTime);
    const blockReasons = buildBlockReasons(row, now);

    return {
      shiftId: toRequiredNumber(row.id),
      dateKey: getCopenhagenDateKey(startTime),
      startTime,
      endTime,
      userId: toNullableNumber(row.userId),
      userName: getUserName(row),
      jobFunctionName: row.jobFunctionNameSnapshot,
      canDelete: blockReasons.length === 0,
      blockReasons,
    };
  });
  const deletableItems = items.filter((item) => item.canDelete);
  const blockedItems = items.filter((item) => !item.canDelete);
  const affectedDateKeys = unique(items.map((item) => item.dateKey)).sort();
  const blockingReasons = unique(
    blockedItems.flatMap((item) => item.blockReasons),
  );

  return {
    mode: 'PREVIEW_ONLY',
    createsOrChangesShifts: false,
    cinemaId,
    scope: range.scope,
    requestedDateKey: range.requestedDateKey,
    startDateKey: range.startDateKey,
    endDateKey: range.endDateKey,
    checkedAt: now,
    summary: {
      selectedShiftCount: items.length,
      deletableShiftCount: deletableItems.length,
      blockedShiftCount: blockedItems.length,
      assignedShiftCount: items.filter((item) => item.userId !== null).length,
      affectedDateCount: affectedDateKeys.length,
      canRemove: items.length > 0 && blockedItems.length === 0,
    },
    blockingReasons,
    items,
  };
}

async function findPlanningShiftRemovalRows(
  db: PlanningShiftRemovalDb,
  cinemaId: number,
  range: PlanningShiftRemovalRange,
  lockRows: boolean,
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
      s."jobFunctionNameSnapshot",
      (
        SELECT CAST(COUNT(*) AS INTEGER)
        FROM "TimeEntry" te
        WHERE te."shiftId" = s.id
          AND te.status <> 'VOIDED'
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
    return db.$queryRaw<PlanningShiftRemovalRow[]>(Prisma.sql`
      ${baseSql}
      FOR UPDATE OF s
    `);
  }

  return db.$queryRaw<PlanningShiftRemovalRow[]>(baseSql);
}

async function refreshMonthPlanCountsForDateKeys(
  db: PlanningShiftRemovalTransactionDb,
  cinemaId: number,
  dateKeys: string[],
) {
  for (const dateKey of dateKeys) {
    const { start, end } = getCopenhagenDayInstantRange(dateKey);
    await db.$executeRaw(Prisma.sql`
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

export async function previewPlanningShiftRemoval(
  prisma: PrismaService,
  input: {
    cinemaId: number;
    scope: unknown;
    dateKey: unknown;
    now?: Date;
  },
) {
  const range = buildPlanningShiftRemovalRange(input.scope, input.dateKey);
  const rows = await findPlanningShiftRemovalRows(
    prisma,
    input.cinemaId,
    range,
    false,
  );
  return buildPlanningShiftRemovalPreviewFromRows(
    input.cinemaId,
    range,
    rows,
    input.now,
  );
}

export async function removePlanningShifts(
  dependencies: {
    prisma: PrismaService;
    realtimeGateway: RealtimeGateway;
    pushService: PushService;
  },
  user: AuthUser,
  input: {
    cinemaId: number;
    scope: unknown;
    dateKey: unknown;
    confirmationText: unknown;
    now?: Date;
  },
) {
  if (
    String(input.confirmationText ?? '').trim() !==
    PLANNING_SHIFT_REMOVAL_CONFIRMATION_TEXT
  ) {
    throw new BadRequestException(
      'Bekræft fjernelsen, før vagterne slettes.',
    );
  }

  const range = buildPlanningShiftRemovalRange(input.scope, input.dateKey);
  const actorUserId = Number(user.sub ?? user.id);
  const now = input.now ?? new Date();

  const result = await dependencies.prisma.$transaction(async (tx) => {
    const rows = await findPlanningShiftRemovalRows(
      tx as unknown as PlanningShiftRemovalDb,
      input.cinemaId,
      range,
      true,
    );
    const preview = buildPlanningShiftRemovalPreviewFromRows(
      input.cinemaId,
      range,
      rows,
      now,
    );

    if (preview.summary.selectedShiftCount === 0) {
      throw new BadRequestException(
        'Der er ingen fremtidige vagter fra vagtplanlægningen i perioden.',
      );
    }
    if (!preview.summary.canRemove) {
      throw new BadRequestException(
        preview.blockingReasons[0] ??
          'En eller flere vagter kan ikke fjernes sikkert.',
      );
    }

    const shiftIds = preview.items.map((item) => item.shiftId);
    const deletedRows = await tx.$queryRaw<Array<{ id: number | bigint }>>(
      Prisma.sql`
        DELETE FROM "Shift"
        WHERE "cinemaId" = ${input.cinemaId}
          AND id IN (${Prisma.join(shiftIds)})
          AND COALESCE("timingRuleSnapshot" ->> 'source', '') = 'SHIFT_PLANNING_DRAFT'
        RETURNING id
      `,
    );
    if (deletedRows.length !== shiftIds.length) {
      throw new BadRequestException(
        'Vagtplanen blev ændret under kontrollen. Ingen delvis fjernelse er godkendt.',
      );
    }

    const affectedDateKeys = unique(
      preview.items.map((item) => item.dateKey),
    ).sort();
    await refreshMonthPlanCountsForDateKeys(
      tx as unknown as PlanningShiftRemovalTransactionDb,
      input.cinemaId,
      affectedDateKeys,
    );

    if (Number.isInteger(actorUserId) && actorUserId > 0) {
      const description =
        `Fjernede ${shiftIds.length} vagt(er) oprettet fra vagtplanlægningen ` +
        `i perioden ${range.startDateKey} til ${range.endDateKey}. ` +
        `Shift-id'er: ${shiftIds.join(', ')}.`;
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
          'BULK_DELETE_PLANNED_SHIFTS',
          'Shift',
          NULL,
          ${description},
          CURRENT_TIMESTAMP,
          ${actorUserId},
          ${input.cinemaId}
        )
      `);
    }

    return {
      preview,
      removedShiftIds: shiftIds,
      affectedDateKeys,
      assignedUserIds: Array.from(
        new Set(
          preview.items
            .map((item) => item.userId)
            .filter((userId): userId is number => userId !== null),
        ),
      ),
    };
  });

  dependencies.realtimeGateway.notifyCinema(input.cinemaId, 'shiftsUpdated', {
    cinemaId: input.cinemaId,
    source: 'SHIFT_PLANNING_BULK_REMOVAL',
    deleted: true,
    removedShiftCount: result.removedShiftIds.length,
    removedShiftIds: result.removedShiftIds,
    affectedDateKeys: result.affectedDateKeys,
  });

  await Promise.allSettled(
    result.assignedUserIds.map((userId) =>
      dependencies.pushService.sendToUserInCinema(userId, input.cinemaId, {
        title: 'Vagter fjernet fra vagtplanen',
        body: `${result.removedShiftIds.length} planlagte vagter er fjernet i perioden ${range.startDateKey}–${range.endDateKey}.`,
        url: '/my-shifts',
      }),
    ),
  );

  return {
    removedShiftCount: result.removedShiftIds.length,
    removedShiftIds: result.removedShiftIds,
    affectedDateKeys: result.affectedDateKeys,
    assignedUserCount: result.assignedUserIds.length,
    scope: range.scope,
    startDateKey: range.startDateKey,
    endDateKey: range.endDateKey,
  };
}
