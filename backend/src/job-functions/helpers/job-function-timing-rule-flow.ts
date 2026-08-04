import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthUser,
  CinemaContextValue,
  JobFunctionTimingAnchorValue,
  JobFunctionTimingRuleData,
  NumberContextValue,
} from './job-function-service-helpers';
import {
  ensureJobFunctionAdmin,
  findJobFunctionForCinema,
  getRequiredJobFunctionCinemaId,
  jobFunctionTimingRuleInclude,
  parseBooleanValue,
  withJobFunctionCinemaLock,
} from './job-function-service-helpers';

const TIMING_ANCHORS: JobFunctionTimingAnchorValue[] = [
  'FIRST_MOVIE_START',
  'FIRST_MOVIE_END',
  'LAST_MOVIE_START',
  'LAST_MOVIE_END',
  'FIXED_TIME',
];
const MAX_TIMING_MINUTE = 2 * 24 * 60;

function normalizeTimingAnchor(
  value: unknown,
  fallback: JobFunctionTimingAnchorValue,
) {
  if (value === undefined || value === null || value === '') return fallback;
  if (
    typeof value !== 'string' ||
    !TIMING_ANCHORS.includes(value as JobFunctionTimingAnchorValue)
  ) {
    throw new BadRequestException('Timing-reglen har en ugyldig anker-type.');
  }
  return value as JobFunctionTimingAnchorValue;
}

function parseOptionalInteger(value: NumberContextValue, message: string) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (
    (typeof value !== 'string' && typeof value !== 'number') ||
    (typeof value === 'string' && !/^-?[0-9]+$/.test(value))
  ) {
    throw new BadRequestException(message);
  }
  const parsedValue = Number(value);
  if (!Number.isSafeInteger(parsedValue)) throw new BadRequestException(message);
  return parsedValue;
}

function parseOffsetMinutes(value: NumberContextValue, fieldName: string) {
  const offset = parseOptionalInteger(
    value,
    `${fieldName} skal være et helt antal minutter.`,
  );
  if (offset === undefined || offset === null) return 0;
  if (offset < -720 || offset > 720) {
    throw new BadRequestException(
      `${fieldName} skal være mellem -720 og 720 minutter.`,
    );
  }
  return offset;
}

function parseTimelineMinute(
  value: NumberContextValue,
  fieldName: string,
  required = false,
) {
  const minute = parseOptionalInteger(
    value,
    `${fieldName} skal være et gyldigt tidspunkt.`,
  );
  if (required && (minute === undefined || minute === null)) {
    throw new BadRequestException(`${fieldName} mangler.`);
  }
  if (minute === undefined || minute === null) return minute;
  if (minute < 0 || minute > MAX_TIMING_MINUTE) {
    throw new BadRequestException(
      `${fieldName} skal ligge mellem 0 og ${MAX_TIMING_MINUTE} minutter.`,
    );
  }
  return minute;
}

function normalizeEndAfterStart(start: number, end: number) {
  let normalized = end;
  while (normalized <= start) normalized += 24 * 60;
  return normalized;
}

export function normalizeTimingRuleData(data: JobFunctionTimingRuleData = {}) {
  const filmWindowStartMinute =
    parseTimelineMinute(
      data.filmWindowStartMinute,
      'Starten på tidsrummet for filmvisninger',
    ) ?? 0;
  const rawFilmWindowEndMinute =
    parseTimelineMinute(data.filmWindowEndMinute, 'Slutningen på tidsrummet for filmvisninger') ?? 1440;
  const filmWindowEndMinute = normalizeEndAfterStart(
    filmWindowStartMinute,
    rawFilmWindowEndMinute,
  );
  if (filmWindowEndMinute > MAX_TIMING_MINUTE) {
    throw new BadRequestException(
      'Tidsrummet for filmvisninger må højst strække sig to døgn fra planlægningsdatoen.',
    );
  }

  const startAnchor = normalizeTimingAnchor(
    data.startAnchor,
    'FIRST_MOVIE_START',
  );
  const endAnchor = normalizeTimingAnchor(data.endAnchor, 'LAST_MOVIE_END');
  const startOffsetMinutes = parseOffsetMinutes(
    data.startOffsetMinutes,
    'Start-forskydning',
  );
  const endOffsetMinutes = parseOffsetMinutes(
    data.endOffsetMinutes,
    'Slut-forskydning',
  );
  const startFixedMinute =
    startAnchor === 'FIXED_TIME'
      ? parseTimelineMinute(data.startFixedMinute, 'Fast starttidspunkt', true)!
      : null;
  let endFixedMinute =
    endAnchor === 'FIXED_TIME'
      ? parseTimelineMinute(data.endFixedMinute, 'Fast sluttidspunkt', true)!
      : null;
  if (
    startAnchor === 'FIXED_TIME' &&
    endAnchor === 'FIXED_TIME' &&
    startFixedMinute !== null &&
    endFixedMinute !== null
  ) {
    endFixedMinute = normalizeEndAfterStart(startFixedMinute, endFixedMinute);
  }

  const fallbackStartMinute = parseTimelineMinute(
    data.fallbackStartMinute,
    'Fallback-starttidspunkt',
    true,
  )!;
  const rawFallbackEndMinute = parseTimelineMinute(
    data.fallbackEndMinute,
    'Fallback-sluttidspunkt',
    true,
  )!;
  const fallbackEndMinute = normalizeEndAfterStart(
    fallbackStartMinute,
    rawFallbackEndMinute,
  );

  const legacyRoundToQuarter = parseBooleanValue(
    data.roundToQuarter,
    false,
    'Kvartersafrunding skal være true eller false.',
  );
  const roundStartToNearestQuarter = parseBooleanValue(
    data.roundStartToNearestQuarter ?? data.roundStartDownToQuarter,
    legacyRoundToQuarter,
    'Afrunding af mødetid skal være true eller false.',
  );
  const roundEndToNearestQuarter = parseBooleanValue(
    data.roundEndToNearestQuarter ?? data.roundEndUpToQuarter,
    legacyRoundToQuarter,
    'Afrunding af fyraften skal være true eller false.',
  );

  return {
    filmWindowStartMinute,
    filmWindowEndMinute,
    startAnchor,
    startOffsetMinutes,
    startFixedMinute,
    endAnchor,
    endOffsetMinutes,
    endFixedMinute,
    fallbackStartMinute,
    fallbackEndMinute,
    roundToQuarter: roundStartToNearestQuarter && roundEndToNearestQuarter,
    roundStartToNearestQuarter,
    roundEndToNearestQuarter,
    restrictMovieStartsToWindow: parseBooleanValue(
      data.restrictMovieStartsToWindow ?? data.limitToFilmWindow,
      true,
      'Begrænsning til tidsrummet for filmvisninger skal være true eller false.',
    ),
    clampToDayPeriod: parseBooleanValue(
      data.restrictMovieStartsToWindow ?? data.limitToFilmWindow,
      true,
    ),
  };
}

export async function findJobFunctionTimingRule(
  prisma: PrismaService,
  user: AuthUser,
  jobFunctionId: number,
  selectedCinemaId?: CinemaContextValue,
  includeInactive = false,
) {
  ensureJobFunctionAdmin(user);
  const cinemaId = getRequiredJobFunctionCinemaId(user, selectedCinemaId);
  await findJobFunctionForCinema(prisma, jobFunctionId, cinemaId);
  return prisma.jobFunctionTimingRule.findFirst({
    where: {
      cinemaId,
      jobFunctionId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    include: jobFunctionTimingRuleInclude,
  });
}

export async function upsertJobFunctionTimingRule(
  prisma: PrismaService,
  user: AuthUser,
  jobFunctionId: number,
  data: JobFunctionTimingRuleData,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureJobFunctionAdmin(user);
  const cinemaId = getRequiredJobFunctionCinemaId(
    user,
    selectedCinemaId ?? data?.cinemaId,
  );
  const normalizedData = normalizeTimingRuleData(data);

  return withJobFunctionCinemaLock(prisma, cinemaId, async (transaction) => {
    const jobFunction = await findJobFunctionForCinema(
      transaction,
      jobFunctionId,
      cinemaId,
      true,
    );
    return transaction.jobFunctionTimingRule.upsert({
      where: { jobFunctionId: jobFunction.id },
      create: {
        cinemaId,
        jobFunctionId: jobFunction.id,
        ...normalizedData,
        isActive: true,
      },
      update: { ...normalizedData, isActive: true },
      include: jobFunctionTimingRuleInclude,
    });
  });
}

export async function archiveJobFunctionTimingRule(
  prisma: PrismaService,
  user: AuthUser,
  jobFunctionId: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureJobFunctionAdmin(user);
  const cinemaId = getRequiredJobFunctionCinemaId(user, selectedCinemaId);
  return withJobFunctionCinemaLock(prisma, cinemaId, async (transaction) => {
    await findJobFunctionForCinema(transaction, jobFunctionId, cinemaId);
    const existing = await transaction.jobFunctionTimingRule.findFirst({
      where: { cinemaId, jobFunctionId, isActive: true },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(
        'Timing-reglen findes ikke for den valgte jobfunktion.',
      );
    }
    return transaction.jobFunctionTimingRule.update({
      where: { id: existing.id },
      data: { isActive: false },
      include: jobFunctionTimingRuleInclude,
    });
  });
}
