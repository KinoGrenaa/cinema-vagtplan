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
} from './job-function-service-helpers';

const TIMING_ANCHORS: JobFunctionTimingAnchorValue[] = [
  'DAY_PERIOD_START',
  'DAY_PERIOD_END',
  'FIRST_MOVIE_START',
  'LAST_MOVIE_END',
  'FIXED_TIME',
];

function normalizeTimingAnchor(
  value: unknown,
  fallback: JobFunctionTimingAnchorValue,
) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('Timing-reglen har en ugyldig anker-type.');
  }

  if (!TIMING_ANCHORS.includes(value as JobFunctionTimingAnchorValue)) {
    throw new BadRequestException('Timing-reglen har en ugyldig anker-type.');
  }

  return value as JobFunctionTimingAnchorValue;
}

function parseOptionalInteger(value: NumberContextValue, message: string) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue)) {
    throw new BadRequestException(message);
  }

  return parsedValue;
}

function parseOffsetMinutes(value: NumberContextValue, fieldName: string) {
  const offsetMinutes = parseOptionalInteger(
    value,
    `${fieldName} skal være et helt antal minutter.`,
  );

  if (offsetMinutes === undefined || offsetMinutes === null) {
    return 0;
  }

  if (offsetMinutes < -720 || offsetMinutes > 720) {
    throw new BadRequestException(
      `${fieldName} skal være mellem -720 og 720 minutter.`,
    );
  }

  return offsetMinutes;
}

function parseMinuteOfDay(value: NumberContextValue, fieldName: string) {
  const minute = parseOptionalInteger(value, `${fieldName} skal være et gyldigt tidspunkt.`);

  if (minute === undefined || minute === null) {
    return minute;
  }

  if (minute < 0 || minute > 1439) {
    throw new BadRequestException(`${fieldName} skal være mellem 00:00 og 23:59.`);
  }

  return minute;
}

function parseBoolean(value: unknown, fallback: boolean) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }

  throw new BadRequestException('Timing-reglen har en ugyldig ja/nej-værdi.');
}

function normalizeTimingRuleData(data: JobFunctionTimingRuleData) {
  const startAnchor = normalizeTimingAnchor(data.startAnchor, 'DAY_PERIOD_START');
  const endAnchor = normalizeTimingAnchor(data.endAnchor, 'DAY_PERIOD_END');
  const startOffsetMinutes = parseOffsetMinutes(
    data.startOffsetMinutes,
    'Start-forskydning',
  );
  const endOffsetMinutes = parseOffsetMinutes(
    data.endOffsetMinutes,
    'Slut-forskydning',
  );

  const parsedStartFixedMinute = parseMinuteOfDay(
    data.startFixedMinute,
    'Fast starttidspunkt',
  );
  const parsedEndFixedMinute = parseMinuteOfDay(
    data.endFixedMinute,
    'Fast sluttidspunkt',
  );

  const startFixedMinute =
    startAnchor === 'FIXED_TIME' ? parsedStartFixedMinute : null;
  const endFixedMinute = endAnchor === 'FIXED_TIME' ? parsedEndFixedMinute : null;

  if (
    startAnchor === 'FIXED_TIME' &&
    (startFixedMinute === undefined || startFixedMinute === null)
  ) {
    throw new BadRequestException('Fast starttidspunkt mangler.');
  }

  if (
    endAnchor === 'FIXED_TIME' &&
    (endFixedMinute === undefined || endFixedMinute === null)
  ) {
    throw new BadRequestException('Fast sluttidspunkt mangler.');
  }

  const fallbackStartMinute = parseMinuteOfDay(
    data.fallbackStartMinute,
    'Fallback starttidspunkt',
  );
  const fallbackEndMinute = parseMinuteOfDay(
    data.fallbackEndMinute,
    'Fallback sluttidspunkt',
  );
  const hasFallbackStart =
    fallbackStartMinute !== undefined && fallbackStartMinute !== null;
  const hasFallbackEnd = fallbackEndMinute !== undefined && fallbackEndMinute !== null;

  if (hasFallbackStart !== hasFallbackEnd) {
    throw new BadRequestException('Fallback skal have både start og slut.');
  }

  if (
    hasFallbackStart &&
    hasFallbackEnd &&
    Number(fallbackEndMinute) <= Number(fallbackStartMinute)
  ) {
    throw new BadRequestException(
      'Fallback-starttidspunkt skal være før fallback-sluttidspunkt.',
    );
  }

  return {
    startAnchor,
    startOffsetMinutes,
    startFixedMinute,
    endAnchor,
    endOffsetMinutes,
    endFixedMinute,
    fallbackStartMinute: hasFallbackStart ? Number(fallbackStartMinute) : null,
    fallbackEndMinute: hasFallbackEnd ? Number(fallbackEndMinute) : null,
    clampToDayPeriod: parseBoolean(data.clampToDayPeriod, true),
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
    selectedCinemaId ?? data.cinemaId,
  );
  const jobFunction = await findJobFunctionForCinema(
    prisma,
    jobFunctionId,
    cinemaId,
    true,
  );
  const normalizedData = normalizeTimingRuleData(data);

  return prisma.jobFunctionTimingRule.upsert({
    where: {
      jobFunctionId: jobFunction.id,
    },
    create: {
      cinemaId,
      jobFunctionId: jobFunction.id,
      ...normalizedData,
      isActive: true,
    },
    update: {
      ...normalizedData,
      isActive: true,
    },
    include: jobFunctionTimingRuleInclude,
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
  await findJobFunctionForCinema(prisma, jobFunctionId, cinemaId);

  const existing = await prisma.jobFunctionTimingRule.findFirst({
    where: {
      cinemaId,
      jobFunctionId,
      isActive: true,
    },
  });

  if (!existing) {
    throw new NotFoundException('Timing-reglen findes ikke for den valgte jobfunktion.');
  }

  return prisma.jobFunctionTimingRule.update({
    where: {
      id: existing.id,
    },
    data: {
      isActive: false,
    },
    include: jobFunctionTimingRuleInclude,
  });
}
