import { resolveJobFunctionTiming } from '../job-functions/helpers/job-function-timing-resolver';
import type { PrismaService } from '../prisma/prisma.service';
import {
  buildCopenhagenDateTimeFromMinute,
  getCopenhagenMonthInstantRange,
} from './shift-planning-time-zone';
import { validateDraftShiftMinutes } from './shift-planning-draft-time-validation';
import {
  applyPublicationSafetyBlocks,
  EXISTING_SHIFT_BLOCK_REASON,
  getPublicationSafetyInstantRange,
  PAST_DRAFT_ITEM_BLOCK_REASON,
} from './shift-planning-publication-safety';

type WorkingPreviewWarning = {
  code: string;
  dateKey?: string;
  message: string;
};

type WorkingPreviewGeneratedItem = {
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
  jobFunctionName: string | null;
  jobFunctionColor: string | null;
  jobFunctionIsActive: boolean | null;
  jobFunctionArchivedAt: Date | string | null;
  userName: string | null;
  userEmail: string | null;
};

const INTERNAL_USER_OVERLAP_REASON =
  'Samme medarbejder er foreslået i overlappende vagter.';
const EXISTING_USER_OVERLAP_REASON =
  'Medarbejderen har allerede en overlappende vagt i vagtplanen.';

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

function resolvePlannedTiming(
  jobFunction: any,
  date: Date,
  movieShowings: Array<{ id?: number; startTime: Date; endTime: Date }>,
) {
  const timingRule = jobFunction?.timingRule;
  if (!timingRule) return null;

  try {
    return resolveJobFunctionTiming(
      date,
      {
        filmWindowStartMinute: Number(timingRule.filmWindowStartMinute ?? 0),
        filmWindowEndMinute: Number(timingRule.filmWindowEndMinute ?? 1440),
        startAnchor: timingRule.startAnchor,
        startOffsetMinutes: Number(timingRule.startOffsetMinutes ?? 0),
        startFixedMinute: timingRule.startFixedMinute ?? null,
        endAnchor: timingRule.endAnchor,
        endOffsetMinutes: Number(timingRule.endOffsetMinutes ?? 0),
        endFixedMinute: timingRule.endFixedMinute ?? null,
        fallbackStartMinute: timingRule.fallbackStartMinute ?? null,
        fallbackEndMinute: timingRule.fallbackEndMinute ?? null,
        roundStartToNearestQuarter: Boolean(
          timingRule.roundStartToNearestQuarter ?? timingRule.roundToQuarter,
        ),
        roundEndToNearestQuarter: Boolean(
          timingRule.roundEndToNearestQuarter ?? timingRule.roundToQuarter,
        ),
        restrictMovieStartsToWindow: Boolean(
          timingRule.restrictMovieStartsToWindow,
        ),
      },
      movieShowings,
    );
  } catch {
    return null;
  }
}

function uniqueMessages(messages: Array<string | null | undefined>) {
  return Array.from(new Set(messages.filter((message): message is string => Boolean(message))));
}

function addBlockReason(
  item: { canBecomeShift: boolean; blockReasons: string[] },
  reason: string,
) {
  item.canBecomeShift = false;
  item.blockReasons = uniqueMessages([...item.blockReasons, reason]);
}

function rangesOverlap(
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date,
) {
  return firstStart < secondEnd && firstEnd > secondStart;
}

export async function buildShiftPlanningMonthData(
  prisma: PrismaService,
  cinemaId: number,
  year: number,
  month: number,
) {
  const { start, end } = getMonthRange(year, month);
  const movieRange = getCopenhagenMonthInstantRange(year, month);
  const monthPlanDays = (await prisma.monthPlanDay.findMany({
    where: {
      cinemaId,
      date: { gte: start, lt: end },
      isActive: true,
      scheduleTemplateId: { not: null },
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
                  jobFunction: { include: { timingRule: true } },
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
  })) as any[];
  const movieShowings = (await prisma.movieShowing.findMany({
    where: {
      cinemaId,
      startTime: { gte: movieRange.start, lt: movieRange.end },
    },
    orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
    select: { id: true, startTime: true, endTime: true },
  })) as Array<{ id: number; startTime: Date; endTime: Date }>;
  const warnings: WorkingPreviewWarning[] = [];
  const items: WorkingPreviewGeneratedItem[] = [];

  for (const monthPlanDay of monthPlanDays) {
    const template = monthPlanDay.scheduleTemplate;
    const date = monthPlanDay.date as Date;
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
      (day: any) => day.weekday === weekday && day.isActive,
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
      const resolvedTiming = resolvePlannedTiming(jobFunction, date, movieShowings);
      const plannedStartMinute = resolvedTiming?.startMinute ?? null;
      const plannedEndMinute = resolvedTiming?.endMinute ?? null;
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
        const userName = assignment?.user
          ? `${assignment.user.firstName ?? ''} ${assignment.user.lastName ?? ''}`.trim()
          : null;

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
            timingSource: resolvedTiming ? 'JOB_FUNCTION_RULE' : null,
            timingRuleSnapshot: resolvedTiming?.explanation ?? null,
            sourceMovieShowingIds: resolvedTiming?.sourceMovieShowingIds ?? [],
            assignedUserName: userName,
          },
          jobFunctionName: jobFunction?.name ?? null,
          jobFunctionColor: jobFunction?.color ?? null,
          jobFunctionIsActive:
            typeof jobFunction?.isActive === 'boolean'
              ? jobFunction.isActive
              : null,
          jobFunctionArchivedAt: jobFunction?.archivedAt ?? null,
          userName: userName || null,
          userEmail: assignment?.user?.email ?? null,
        });
      }
    }
  }

  return { warnings, items };
}

export async function buildShiftPlanningMonthWorkingPreview(
  prisma: PrismaService,
  cinemaId: number,
  year: number,
  month: number,
  now = new Date(),
) {
  const generated = await buildShiftPlanningMonthData(
    prisma,
    cinemaId,
    year,
    month,
  );
  const items = generated.items.map((item, index) => {
    const dateKey = toIsoDateOnly(item.date);
    const blockReasons: string[] = [];
    let startTime: Date | null = null;
    let endTime: Date | null = null;

    if (
      item.plannedStartMinute !== null &&
      item.plannedEndMinute !== null
    ) {
      const validation = validateDraftShiftMinutes(
        item.plannedStartMinute,
        item.plannedEndMinute,
      );
      if (validation.normalizedEndMinute !== null) {
        startTime = buildCopenhagenDateTimeFromMinute(
          item.date,
          item.plannedStartMinute,
        );
        endTime = buildCopenhagenDateTimeFromMinute(
          item.date,
          validation.normalizedEndMinute,
        );
      }
    }

    if (item.warningMessage) {
      blockReasons.push(item.warningMessage);
    }
    if (!item.jobFunctionId) {
      blockReasons.push('Jobfunktion mangler.');
    }
    if (item.jobFunctionIsActive === false || item.jobFunctionArchivedAt) {
      blockReasons.push(
        `${item.jobFunctionName ?? 'Jobfunktionen'} er arkiveret eller inaktiv.`,
      );
    }
    if (!startTime || !endTime) {
      blockReasons.push('Vagten mangler et gyldigt start- eller sluttidspunkt.');
    }

    return {
      previewItemId: `${dateKey}:${item.templateJobFunctionId ?? 'job'}:${item.requiredIndex}:${index}`,
      dateKey,
      monthPlanDayId: item.monthPlanDayId,
      scheduleTemplateId: item.scheduleTemplateId,
      scheduleTemplateDayId: item.scheduleTemplateDayId,
      templateJobFunctionId: item.templateJobFunctionId,
      jobFunctionId: item.jobFunctionId,
      jobFunctionName: item.jobFunctionName,
      jobFunctionColor: item.jobFunctionColor,
      userId: item.userId,
      userName: item.userName,
      userEmail: item.userEmail,
      requiredIndex: item.requiredIndex,
      plannedStartMinute: item.plannedStartMinute,
      plannedEndMinute: item.plannedEndMinute,
      startTime,
      endTime,
      canBecomeShift: blockReasons.length === 0,
      blockReasons: uniqueMessages(blockReasons),
      warningCode: item.warningCode,
      warningMessage: item.warningMessage,
    };
  });
  const instantRange = getPublicationSafetyInstantRange(items);
  const existingShifts = instantRange
    ? ((await prisma.shift.findMany({
        where: {
          cinemaId,
          startTime: { lt: instantRange.end },
          endTime: { gt: instantRange.start },
        },
        select: {
          id: true,
          jobFunctionId: true,
          userId: true,
          startTime: true,
          endTime: true,
        },
        orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
      })) as Array<{
        id: number;
        jobFunctionId: number | null;
        userId: number | null;
        startTime: Date;
        endTime: Date;
      }>)
    : [];

  applyPublicationSafetyBlocks(items, existingShifts, now);

  for (let firstIndex = 0; firstIndex < items.length; firstIndex += 1) {
    const first = items[firstIndex];
    if (
      !first.canBecomeShift ||
      first.userId === null ||
      !first.startTime ||
      !first.endTime
    ) {
      continue;
    }

    for (let secondIndex = firstIndex + 1; secondIndex < items.length; secondIndex += 1) {
      const second = items[secondIndex];
      if (
        !second.canBecomeShift ||
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
        addBlockReason(first, INTERNAL_USER_OVERLAP_REASON);
        addBlockReason(second, INTERNAL_USER_OVERLAP_REASON);
      }
    }
  }

  for (const item of items) {
    if (
      !item.canBecomeShift ||
      item.userId === null ||
      !item.startTime ||
      !item.endTime
    ) {
      continue;
    }

    const hasExistingUserOverlap = existingShifts.some(
      (shift) =>
        shift.userId === item.userId &&
        rangesOverlap(
          item.startTime as Date,
          item.endTime as Date,
          shift.startTime,
          shift.endTime,
        ),
    );
    if (hasExistingUserOverlap) {
      addBlockReason(item, EXISTING_USER_OVERLAP_REASON);
    }
  }

  const readyItemCount = items.filter((item) => item.canBecomeShift).length;
  const blockedItemCount = items.length - readyItemCount;

  return {
    cinemaId,
    year,
    month,
    checkedAt: new Date(),
    source: 'MONTH_PLAN_WORKING_PREVIEW',
    persistsDraft: false,
    summary: {
      itemCount: items.length,
      readyItemCount,
      blockedItemCount,
      existingShiftCount: items.filter((item) =>
        item.blockReasons.includes(EXISTING_SHIFT_BLOCK_REASON),
      ).length,
      pastItemCount: items.filter((item) =>
        item.blockReasons.includes(PAST_DRAFT_ITEM_BLOCK_REASON),
      ).length,
      warningCount: generated.warnings.length,
      hasProblems: blockedItemCount > 0 || generated.warnings.length > 0,
    },
    warnings: generated.warnings,
    items,
  };
}
