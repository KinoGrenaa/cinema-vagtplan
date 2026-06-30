import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type AuthUser = {
  sub?: number;
  id?: number;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId?: number | null;
};

type DraftRequestData = {
  year?: number | string;
  month?: number | string;
  cinemaId?: number | string | null;
  note?: string | null;
};

type DraftWarning = {
  code: string;
  dateKey?: string;
  message: string;
};

type DraftItemInput = {
  date: Date;
  monthPlanDayId: number | null;
  scheduleTemplateId: number | null;
  scheduleTemplateDayId: number | null;
  templateJobFunctionId: number | null;
  jobFunctionId: number | null;
  userId: number | null;
  requiredIndex: number;
  plannedStartMinute: number | null;
  plannedEndMinute: number | null;
  warningCode: string | null;
  warningMessage: string | null;
  metadata: Record<string, unknown>;
};

type DraftValidationIssue = {
  severity: 'ERROR' | 'WARNING';
  code: string;
  message: string;
  itemId?: number;
  dateKey?: string;
  userId?: number | null;
  relatedShiftId?: number;
  relatedItemId?: number;
};

type DraftValidationInterval = {
  itemId: number;
  userId: number | null;
  dateKey: string;
  start: Date | null;
  end: Date | null;
  plannedStartMinute: number | null;
  plannedEndMinute: number | null;
};

function ensureAdminAccess(user: AuthUser) {
  if (user.role === 'MASTER' || user.role === 'ADMIN') {
    return;
  }

  throw new ForbiddenException('Ingen adgang.');
}

function parsePositiveInt(value: unknown, fieldName: string) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new BadRequestException(`${fieldName} skal være et gyldigt tal.`);
  }

  return parsedValue;
}

function parseYear(value: unknown) {
  const year = parsePositiveInt(value, 'År');

  if (year < 2000 || year > 2100) {
    throw new BadRequestException('År skal være mellem 2000 og 2100.');
  }

  return year;
}

function parseMonth(value: unknown) {
  const month = parsePositiveInt(value, 'Måned');

  if (month < 1 || month > 12) {
    throw new BadRequestException('Måned skal være et tal fra 1 til 12.');
  }

  return month;
}

function parseOptionalNote(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('Note skal være tekst.');
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveCinemaId(
  user: AuthUser,
  selectedCinemaId?: number | string | null,
) {
  ensureAdminAccess(user);

  if (user.role === 'MASTER') {
    const cinemaId = Number(selectedCinemaId);

    if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
      throw new BadRequestException(
        'Vælg en biograf, før du arbejder med planlægningskladder.',
      );
    }

    return cinemaId;
  }

  const cinemaId = Number(user.cinemaId);

  if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
    throw new ForbiddenException('Ingen biograf er knyttet til din bruger.');
  }

  return cinemaId;
}

function getActorUserId(user: AuthUser) {
  const userId = Number(user.sub ?? user.id);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function getMonthRange(year: number, month: number) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)),
  };
}

function toIsoDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getIsoWeekday(date: Date) {
  const weekday = date.getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

function getIsoWeekNumber(date: Date) {
  const copiedDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayNumber = copiedDate.getUTCDay() || 7;
  copiedDate.setUTCDate(copiedDate.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(copiedDate.getUTCFullYear(), 0, 1));

  return Math.ceil(
    ((copiedDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
}

function getWeekParityForDate(date: Date) {
  const weekNumber = getIsoWeekNumber(date);

  return {
    weekNumber,
    parity: weekNumber % 2 === 0 ? 'EVEN' : 'ODD',
  };
}

function isWeekParityMismatch(templateWeekParity: string, date: Date) {
  if (!templateWeekParity || templateWeekParity === 'ANY') {
    return false;
  }

  return templateWeekParity !== getWeekParityForDate(date).parity;
}

function resolvePlannedStartMinute(jobFunction: any) {
  const timingRule = jobFunction?.timingRule;

  if (
    timingRule?.startAnchor === 'FIXED_TIME' &&
    timingRule.startFixedMinute !== null &&
    timingRule.startFixedMinute !== undefined
  ) {
    return timingRule.startFixedMinute;
  }

  if (
    timingRule?.fallbackStartMinute !== null &&
    timingRule?.fallbackStartMinute !== undefined
  ) {
    return timingRule.fallbackStartMinute;
  }

  if (
    jobFunction?.dayPeriod?.startMinute !== null &&
    jobFunction?.dayPeriod?.startMinute !== undefined
  ) {
    return jobFunction.dayPeriod.startMinute;
  }

  return null;
}

function resolvePlannedEndMinute(jobFunction: any) {
  const timingRule = jobFunction?.timingRule;

  if (
    timingRule?.endAnchor === 'FIXED_TIME' &&
    timingRule.endFixedMinute !== null &&
    timingRule.endFixedMinute !== undefined
  ) {
    return timingRule.endFixedMinute;
  }

  if (
    timingRule?.fallbackEndMinute !== null &&
    timingRule?.fallbackEndMinute !== undefined
  ) {
    return timingRule.fallbackEndMinute;
  }

  if (
    jobFunction?.dayPeriod?.endMinute !== null &&
    jobFunction?.dayPeriod?.endMinute !== undefined
  ) {
    return jobFunction.dayPeriod.endMinute;
  }

  return null;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeDraftRow(row: any) {
  const items = Array.isArray(row.items) ? row.items : [];
  const itemCount =
    row.itemCount !== undefined && row.itemCount !== null
      ? Number(row.itemCount)
      : items.length;
  const unassignedItemCount =
    row.unassignedItemCount !== undefined && row.unassignedItemCount !== null
      ? Number(row.unassignedItemCount)
      : items.filter((item) => item.userId === null).length;
  const warningItemCount =
    row.warningItemCount !== undefined && row.warningItemCount !== null
      ? Number(row.warningItemCount)
      : items.filter((item) => item.warningCode).length;
  const { items: _items, ...draft } = row;

  return {
    ...draft,
    id: Number(draft.id),
    cinemaId: Number(draft.cinemaId),
    year: Number(draft.year),
    month: Number(draft.month),
    createdByUserId: toNullableNumber(draft.createdByUserId),
    itemCount,
    unassignedItemCount,
    warningItemCount,
  };
}

function normalizeDraftRows(rows: any[]) {
  return rows.map((row) => normalizeDraftRow(row));
}

function normalizeDraftItemRows(rows: any[]) {
  return rows.map((row) => {
    const item = {
      ...row,
      id: Number(row.id),
      cinemaId: Number(row.cinemaId),
      draftId: Number(row.draftId),
      monthPlanDayId: toNullableNumber(row.monthPlanDayId),
      scheduleTemplateId: toNullableNumber(row.scheduleTemplateId),
      scheduleTemplateDayId: toNullableNumber(row.scheduleTemplateDayId),
      templateJobFunctionId: toNullableNumber(row.templateJobFunctionId),
      jobFunctionId: toNullableNumber(row.jobFunctionId),
      userId: toNullableNumber(row.userId),
      requiredIndex: Number(row.requiredIndex),
      plannedStartMinute: toNullableNumber(row.plannedStartMinute),
      plannedEndMinute: toNullableNumber(row.plannedEndMinute),
      jobFunctionName: row.jobFunction?.name ?? row.jobFunctionName ?? null,
      jobFunctionColor: row.jobFunction?.color ?? row.jobFunctionColor ?? null,
      scheduleTemplateName:
        row.scheduleTemplate?.name ?? row.scheduleTemplateName ?? null,
      userFirstName: row.user?.firstName ?? row.userFirstName ?? null,
      userLastName: row.user?.lastName ?? row.userLastName ?? null,
      userEmail: row.user?.email ?? row.userEmail ?? null,
    };

    delete item.jobFunction;
    delete item.scheduleTemplate;
    delete item.user;

    return item;
  });
}

function toDate(value: unknown) {
  return value instanceof Date ? value : new Date(String(value));
}

function buildDraftItemInterval(row: any): DraftValidationInterval {
  const date = toDate(row.date);
  const dateKey = toIsoDateOnly(date);
  const plannedStartMinute = toNullableNumber(row.plannedStartMinute);
  const plannedEndMinute = toNullableNumber(row.plannedEndMinute);

  if (plannedStartMinute === null || plannedEndMinute === null) {
    return {
      itemId: Number(row.id),
      userId: toNullableNumber(row.userId),
      dateKey,
      start: null,
      end: null,
      plannedStartMinute,
      plannedEndMinute,
    };
  }

  const start = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      plannedStartMinute,
      0,
      0,
    ),
  );
  const normalizedEndMinute =
    plannedEndMinute <= plannedStartMinute
      ? plannedEndMinute + 24 * 60
      : plannedEndMinute;
  const end = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      normalizedEndMinute,
      0,
      0,
    ),
  );

  return {
    itemId: Number(row.id),
    userId: toNullableNumber(row.userId),
    dateKey,
    start,
    end,
    plannedStartMinute,
    plannedEndMinute,
  };
}

function rangesOverlap(
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date,
) {
  return firstStart < secondEnd && firstEnd > secondStart;
}

function getValidationSummary(issues: DraftValidationIssue[]) {
  const errorCount = issues.filter((issue) => issue.severity === 'ERROR').length;
  const warningCount = issues.filter(
    (issue) => issue.severity === 'WARNING',
  ).length;

  return {
    isValid: errorCount === 0,
    errorCount,
    warningCount,
    issueCount: issues.length,
  };
}

@Injectable()
export class ShiftPlanningDraftsService {
  constructor(private prisma: PrismaService) {}

  async findMonth(
    user: AuthUser,
    yearValue?: string,
    monthValue?: string,
    cinemaIdValue?: string,
  ) {
    const cinemaId = resolveCinemaId(user, cinemaIdValue);
    const year = parseYear(yearValue);
    const month = parseMonth(monthValue);
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        d.*,
        COALESCE(c."itemCount", 0)::int AS "itemCount",
        COALESCE(c."unassignedItemCount", 0)::int AS "unassignedItemCount",
        COALESCE(c."warningItemCount", 0)::int AS "warningItemCount"
      FROM "ShiftPlanningDraft" d
      LEFT JOIN (
        SELECT
          i."draftId",
          COUNT(i.id)::int AS "itemCount",
          COUNT(i.id) FILTER (WHERE i."userId" IS NULL)::int AS "unassignedItemCount",
          COUNT(i.id) FILTER (WHERE i."warningCode" IS NOT NULL)::int AS "warningItemCount"
        FROM "ShiftPlanningDraftItem" i
        GROUP BY i."draftId"
      ) c ON c."draftId" = d.id
      WHERE d."cinemaId" = ${cinemaId}
        AND d."year" = ${year}
        AND d."month" = ${month}
      ORDER BY d."createdAt" DESC, d.id DESC
    `);

    return {
      cinemaId,
      year,
      month,
      drafts: normalizeDraftRows(rows),
    };
  }

  async findOne(user: AuthUser, id: number, cinemaIdValue?: string) {
    const selectedCinemaId = user.role === 'MASTER' ? cinemaIdValue : user.cinemaId;
    const cinemaId = resolveCinemaId(user, selectedCinemaId);
    const draftRows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        d.*,
        COALESCE(c."itemCount", 0)::int AS "itemCount",
        COALESCE(c."unassignedItemCount", 0)::int AS "unassignedItemCount",
        COALESCE(c."warningItemCount", 0)::int AS "warningItemCount"
      FROM "ShiftPlanningDraft" d
      LEFT JOIN (
        SELECT
          i."draftId",
          COUNT(i.id)::int AS "itemCount",
          COUNT(i.id) FILTER (WHERE i."userId" IS NULL)::int AS "unassignedItemCount",
          COUNT(i.id) FILTER (WHERE i."warningCode" IS NOT NULL)::int AS "warningItemCount"
        FROM "ShiftPlanningDraftItem" i
        GROUP BY i."draftId"
      ) c ON c."draftId" = d.id
      WHERE d.id = ${id}
        AND d."cinemaId" = ${cinemaId}
      LIMIT 1
    `);

    if (draftRows.length === 0) {
      throw new NotFoundException('Planlægningskladden findes ikke.');
    }

    const itemRows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        i.*,
        jf.name AS "jobFunctionName",
        jf.color AS "jobFunctionColor",
        st.name AS "scheduleTemplateName",
        u."firstName" AS "userFirstName",
        u."lastName" AS "userLastName",
        u.email AS "userEmail"
      FROM "ShiftPlanningDraftItem" i
      LEFT JOIN "JobFunction" jf ON jf.id = i."jobFunctionId"
      LEFT JOIN "ScheduleTemplate" st ON st.id = i."scheduleTemplateId"
      LEFT JOIN "User" u ON u.id = i."userId"
      WHERE i."draftId" = ${id}
        AND i."cinemaId" = ${cinemaId}
      ORDER BY i.date ASC, i."plannedStartMinute" ASC NULLS LAST, i.id ASC
    `);

    return {
      ...normalizeDraftRows(draftRows)[0],
      items: normalizeDraftItemRows(itemRows),
    };
  }

  async validateDraft(user: AuthUser, id: number, cinemaIdValue?: string) {
    const selectedCinemaId = user.role === 'MASTER' ? cinemaIdValue : user.cinemaId;
    const cinemaId = resolveCinemaId(user, selectedCinemaId);
    const draft = await this.findOne(user, id, String(cinemaId));
    const itemRows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        i.id,
        i."cinemaId",
        i."draftId",
        i.date,
        i."scheduleTemplateId",
        i."scheduleTemplateDayId",
        i."templateJobFunctionId",
        i."jobFunctionId",
        i."userId",
        i."plannedStartMinute",
        i."plannedEndMinute",
        i."warningCode",
        i."warningMessage",
        jf.name AS "jobFunctionName",
        u."firstName" AS "userFirstName",
        u."lastName" AS "userLastName",
        u."isActive" AS "userIsActive"
      FROM "ShiftPlanningDraftItem" i
      LEFT JOIN "JobFunction" jf ON jf.id = i."jobFunctionId"
      LEFT JOIN "User" u ON u.id = i."userId"
      WHERE i."draftId" = ${id}
        AND i."cinemaId" = ${cinemaId}
      ORDER BY i.date ASC, i."plannedStartMinute" ASC NULLS LAST, i.id ASC
    `);

    const issues: DraftValidationIssue[] = [];
    const intervals = itemRows.map((row) => buildDraftItemInterval(row));

    for (const row of itemRows) {
      const itemId = Number(row.id);
      const dateKey = toIsoDateOnly(toDate(row.date));
      const userId = toNullableNumber(row.userId);
      const plannedStartMinute = toNullableNumber(row.plannedStartMinute);
      const plannedEndMinute = toNullableNumber(row.plannedEndMinute);

      if (!row.scheduleTemplateId || !row.scheduleTemplateDayId) {
        issues.push({
          severity: 'ERROR',
          code: 'MISSING_TEMPLATE_REFERENCE',
          itemId,
          dateKey,
          userId,
          message: 'Kladdeposten mangler reference til vagtsskabelon eller ugedag.',
        });
      }

      if (!row.jobFunctionId) {
        issues.push({
          severity: 'ERROR',
          code: 'MISSING_JOB_FUNCTION',
          itemId,
          dateKey,
          userId,
          message: 'Kladdeposten mangler jobfunktion.',
        });
      }

      if (plannedStartMinute === null || plannedEndMinute === null) {
        issues.push({
          severity: 'ERROR',
          code: 'MISSING_TIME_BASIS',
          itemId,
          dateKey,
          userId,
          message: 'Kladdeposten mangler mødetid eller fyraften.',
        });
      }

      if (userId === null) {
        issues.push({
          severity: 'WARNING',
          code: 'UNASSIGNED_DRAFT_ITEM',
          itemId,
          dateKey,
          userId,
          message: 'Kladdeposten er ikke tildelt en medarbejder.',
        });
      }

      if (userId !== null && row.userIsActive === false) {
        issues.push({
          severity: 'ERROR',
          code: 'INACTIVE_USER',
          itemId,
          dateKey,
          userId,
          message: 'Kladdepostens medarbejder er ikke aktiv.',
        });
      }

      if (row.warningCode) {
        issues.push({
          severity: row.warningCode === 'MISSING_TIME_BASIS' ? 'ERROR' : 'WARNING',
          code: String(row.warningCode),
          itemId,
          dateKey,
          userId,
          message: row.warningMessage ?? 'Kladdeposten har en advarsel.',
        });
      }
    }

    const assignedIntervals = intervals.filter(
      (interval) => interval.userId !== null && interval.start && interval.end,
    );

    for (let index = 0; index < assignedIntervals.length; index += 1) {
      const current = assignedIntervals[index];

      for (let otherIndex = index + 1; otherIndex < assignedIntervals.length; otherIndex += 1) {
        const other = assignedIntervals[otherIndex];

        if (
          current.userId !== other.userId ||
          !current.start ||
          !current.end ||
          !other.start ||
          !other.end
        ) {
          continue;
        }

        if (rangesOverlap(current.start, current.end, other.start, other.end)) {
          issues.push({
            severity: 'ERROR',
            code: 'DRAFT_INTERNAL_OVERLAP',
            itemId: current.itemId,
            relatedItemId: other.itemId,
            dateKey: current.dateKey,
            userId: current.userId,
            message:
              'Samme medarbejder er planlagt i overlappende kladdeposter.',
          });
        }
      }
    }

    if (assignedIntervals.length > 0) {
      const rangeStart = new Date(
        Math.min(
          ...assignedIntervals
            .map((interval) => interval.start?.getTime() ?? Number.POSITIVE_INFINITY)
            .filter(Number.isFinite),
        ),
      );
      const rangeEnd = new Date(
        Math.max(
          ...assignedIntervals
            .map((interval) => interval.end?.getTime() ?? 0)
            .filter(Number.isFinite),
        ),
      );
      const userIds = [
        ...new Set(
          assignedIntervals
            .map((interval) => interval.userId)
            .filter((userId): userId is number => userId !== null),
        ),
      ];

      if (userIds.length > 0) {
        const existingShifts = await this.prisma.$queryRaw<any[]>(Prisma.sql`
          SELECT id, "userId", "startTime", "endTime"
          FROM "Shift"
          WHERE "cinemaId" = ${cinemaId}
            AND "userId" IN (${Prisma.join(userIds)})
            AND "startTime" < ${rangeEnd}
            AND "endTime" > ${rangeStart}
          ORDER BY "startTime" ASC, id ASC
        `);

        for (const interval of assignedIntervals) {
          if (!interval.start || !interval.end || interval.userId === null) {
            continue;
          }

          for (const shift of existingShifts) {
            if (Number(shift.userId) !== interval.userId) {
              continue;
            }

            const shiftStart = toDate(shift.startTime);
            const shiftEnd = toDate(shift.endTime);

            if (rangesOverlap(interval.start, interval.end, shiftStart, shiftEnd)) {
              issues.push({
                severity: 'ERROR',
                code: 'EXISTING_SHIFT_OVERLAP',
                itemId: interval.itemId,
                relatedShiftId: Number(shift.id),
                dateKey: interval.dateKey,
                userId: interval.userId,
                message:
                  'Kladdeposten overlapper en eksisterende vagt for samme medarbejder.',
              });
            }
          }
        }
      }
    }

    return {
      draftId: draft.id,
      cinemaId,
      year: draft.year,
      month: draft.month,
      status: draft.status,
      checkedAt: new Date(),
      summary: getValidationSummary(issues),
      issues,
    };
  }

  async prepareMonth(user: AuthUser, data: DraftRequestData) {
    const cinemaId = resolveCinemaId(user, data?.cinemaId);
    const year = parseYear(data?.year);
    const month = parseMonth(data?.month);
    const note = parseOptionalNote(data?.note);
    const actorUserId = getActorUserId(user);
    const { start, end } = getMonthRange(year, month);
    const monthPlanDays = await this.prisma.monthPlanDay.findMany({
      where: {
        cinemaId,
        date: {
          gte: start,
          lt: end,
        },
        isActive: true,
        scheduleTemplateId: {
          not: null,
        },
      },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
      include: {
        scheduleTemplate: {
          include: {
            days: {
              orderBy: [{ weekday: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
              include: {
                jobFunctions: {
                  orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                  include: {
                    jobFunction: {
                      include: {
                        dayPeriod: true,
                        timingRule: true,
                      },
                    },
                    assignments: {
                      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                      include: {
                        user: {
                          select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            isActive: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    const warnings: DraftWarning[] = [];
    const items: DraftItemInput[] = [];

    for (const monthPlanDay of monthPlanDays) {
      const template = monthPlanDay.scheduleTemplate;
      const date = monthPlanDay.date;
      const dateKey = toIsoDateOnly(date);
      const weekday = getIsoWeekday(date);
      const weekInfo = getWeekParityForDate(date);

      if (!template) {
        warnings.push({
          code: 'NO_TEMPLATE',
          dateKey,
          message: 'Dagen har ingen vagtsskabelon.',
        });
        continue;
      }

      if (!template.isActive || template.archivedAt) {
        warnings.push({
          code: 'INACTIVE_TEMPLATE',
          dateKey,
          message: 'Vagtsskabelonen er ikke længere aktiv.',
        });
      }

      if (isWeekParityMismatch(template.weekParity, date)) {
        warnings.push({
          code: 'WEEK_PARITY_MISMATCH',
          dateKey,
          message: 'Vagtsskabelonen passer ikke til datoens lige/ulige uge.',
        });
      }

      const templateDay = template.days.find(
        (day) => day.weekday === weekday && day.isActive,
      );

      if (!templateDay) {
        warnings.push({
          code: 'NO_WEEKDAY_SETUP',
          dateKey,
          message: 'Vagtsskabelonen har ingen aktiv opsætning for denne ugedag.',
        });
        continue;
      }

      for (const templateJobFunction of templateDay.jobFunctions) {
        const requiredCount = Math.max(
          1,
          Number(templateJobFunction.requiredCount ?? 1),
        );
        const jobFunction = templateJobFunction.jobFunction;
        const plannedStartMinute = resolvePlannedStartMinute(jobFunction);
        const plannedEndMinute = resolvePlannedEndMinute(jobFunction);
        const timeWarning =
          plannedStartMinute === null || plannedEndMinute === null
            ? 'Mangler tidsgrundlag for jobfunktionen.'
            : null;

        for (let index = 0; index < requiredCount; index += 1) {
          const assignment = templateJobFunction.assignments[index] ?? null;
          const inactiveUserWarning =
            assignment?.user && !assignment.user.isActive
              ? 'Standardmedarbejderen er ikke længere aktiv.'
              : null;
          const warningMessage = inactiveUserWarning ?? timeWarning;

          items.push({
            date,
            monthPlanDayId: monthPlanDay.id,
            scheduleTemplateId: template.id,
            scheduleTemplateDayId: templateDay.id,
            templateJobFunctionId: templateJobFunction.id,
            jobFunctionId: templateJobFunction.jobFunctionId,
            userId: assignment?.userId ?? null,
            requiredIndex: index + 1,
            plannedStartMinute,
            plannedEndMinute,
            warningCode: warningMessage
              ? inactiveUserWarning
                ? 'INACTIVE_DEFAULT_USER'
                : 'MISSING_TIME_BASIS'
              : null,
            warningMessage,
            metadata: {
              dateKey,
              weekday,
              isoWeek: weekInfo.weekNumber,
              weekParity: weekInfo.parity,
              scheduleTemplateName: template.name,
              templateWeekParity: template.weekParity,
              jobFunctionName: jobFunction?.name ?? null,
              jobFunctionColor: jobFunction?.color ?? null,
              dayPeriodName: jobFunction?.dayPeriod?.name ?? null,
              assignedUserName: assignment?.user
                ? `${assignment.user.firstName} ${assignment.user.lastName}`.trim()
                : null,
            },
          });
        }
      }
    }

    const draftRows = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE "ShiftPlanningDraft"
        SET status = 'SUPERSEDED', "updatedAt" = CURRENT_TIMESTAMP
        WHERE "cinemaId" = ${cinemaId}
          AND year = ${year}
          AND month = ${month}
          AND status = 'DRAFT'
      `);
      const createdRows = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO "ShiftPlanningDraft" (
          "cinemaId", year, month, status, source, note, warnings, "createdByUserId"
        ) VALUES (
          ${cinemaId}, ${year}, ${month}, 'DRAFT', 'MONTH_PLAN', ${note},
          CAST(${JSON.stringify(warnings)} AS jsonb), ${actorUserId}
        )
        RETURNING *
      `);
      const draftId = Number(createdRows[0].id);

      for (const item of items) {
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
            "warningCode",
            "warningMessage",
            metadata
          ) VALUES (
            ${cinemaId},
            ${draftId},
            ${item.date},
            ${item.monthPlanDayId},
            ${item.scheduleTemplateId},
            ${item.scheduleTemplateDayId},
            ${item.templateJobFunctionId},
            ${item.jobFunctionId},
            ${item.userId},
            ${item.requiredIndex},
            'DRAFT',
            ${item.plannedStartMinute},
            ${item.plannedEndMinute},
            ${item.warningCode},
            ${item.warningMessage},
            CAST(${JSON.stringify(item.metadata)} AS jsonb)
          )
        `);
      }

      return createdRows;
    });
    const draftId = Number(draftRows[0].id);

    return this.findOne(user, draftId, String(cinemaId));
  }
}
