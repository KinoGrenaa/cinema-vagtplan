import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';

export type MonthPlanAuthUser = {
  id?: unknown;
  sub?: unknown;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId?: unknown;
};

export type MonthPlanCinemaValue =
  | number
  | string
  | null
  | undefined;

export type MonthPlanDayUpdateData = {
  cinemaId?: unknown;
  isActive?: unknown;
  scheduleTemplateId?: unknown;
  note?: unknown;
  movieProgramFirstStart?: unknown;
  movieProgramLastEnd?: unknown;
  movieShowingCount?: unknown;
  plannedShiftCount?: unknown;
  unassignedShiftCount?: unknown;
};

export type MonthPlanDbClient =
  Prisma.TransactionClient;

const MONTH_PLAN_LOCK_NAMESPACE = 1_296_808_012;
const MAX_MONTH_PLAN_TEXT_LENGTH = 5_000;
const MAX_MONTH_PLAN_COUNT = 2_147_483_647;
const MAX_DATE_TIME_INPUT_LENGTH = 64;
const ISO_DATE_TIME_WITH_ZONE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-](\d{2}):(\d{2}))$/;

export const monthPlanDayInclude: Prisma.MonthPlanDayInclude =
  {
    scheduleTemplate: {
      select: {
        id: true,
        name: true,
        description: true,
        weekParity: true,
        startsOn: true,
        sortOrder: true,
        isActive: true,
        archivedAt: true,
        _count: {
          select: {
            days: true,
          },
        },
      },
    },
  };

function parseStrictInteger(
  value: unknown,
  minimum: number,
  maximum: number,
  message: string,
) {
  if (
    (typeof value !== 'string' &&
      typeof value !== 'number') ||
    (typeof value === 'string' &&
      !/^[0-9]+$/.test(value))
  ) {
    throw new BadRequestException(message);
  }

  const parsedValue = Number(value);

  if (
    !Number.isSafeInteger(parsedValue) ||
    parsedValue < minimum ||
    parsedValue > maximum
  ) {
    throw new BadRequestException(message);
  }

  return parsedValue;
}

function isLeapYear(year: number) {
  return (
    year % 4 === 0 &&
    (year % 100 !== 0 || year % 400 === 0)
  );
}

function getDaysInMonth(
  year: number,
  month: number,
) {
  const daysByMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  return daysByMonth[month - 1] ?? 0;
}

function hasValidDateTimeComponents(
  match: RegExpExecArray,
) {
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second =
    match[6] === undefined
      ? 0
      : Number(match[6]);
  const offsetHour =
    match[9] === undefined
      ? 0
      : Number(match[9]);
  const offsetMinute =
    match[10] === undefined
      ? 0
      : Number(match[10]);

  return (
    year >= 1 &&
    year <= 9999 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= getDaysInMonth(year, month) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59 &&
    second >= 0 &&
    second <= 59 &&
    offsetHour >= 0 &&
    offsetHour <= 14 &&
    offsetMinute >= 0 &&
    offsetMinute <= 59 &&
    (offsetHour !== 14 || offsetMinute === 0)
  );
}

export function normalizeMonthPlanUpdateBody(
  value: unknown,
): MonthPlanDayUpdateData {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw new BadRequestException(
      'Månedsplandagen skal have et gyldigt input.',
    );
  }

  return value as MonthPlanDayUpdateData;
}

export function resolveMonthPlanCinemaId(
  user: MonthPlanAuthUser,
  providedCinemaId?: MonthPlanCinemaValue,
) {
  if (user.role === 'MASTER') {
    try {
      return parseStrictInteger(
        providedCinemaId,
        1,
        Number.MAX_SAFE_INTEGER,
        'Vælg en biograf, før du administrerer månedsplanen.',
      );
    } catch {
      throw new BadRequestException(
        'Vælg en biograf, før du administrerer månedsplanen.',
      );
    }
  }

  if (user.role === 'ADMIN') {
    try {
      return parseStrictInteger(
        user.cinemaId,
        1,
        Number.MAX_SAFE_INTEGER,
        'Ingen biograf er knyttet til din bruger.',
      );
    } catch {
      throw new ForbiddenException(
        'Ingen biograf er knyttet til din bruger.',
      );
    }
  }

  throw new ForbiddenException('Ingen adgang.');
}

export function parseMonthPlanYear(
  value?: unknown,
) {
  return parseStrictInteger(
    value,
    2000,
    2100,
    'År skal være et gyldigt tal.',
  );
}

export function parseMonthPlanMonth(
  value?: unknown,
) {
  return parseStrictInteger(
    value,
    1,
    12,
    'Måned skal være et gyldigt tal fra 1 til 12.',
  );
}

export function normalizeMonthPlanDate(
  date: string,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new BadRequestException(
      'Dato skal angives som ÅÅÅÅ-MM-DD.',
    );
  }

  const parsedDate = new Date(
    `${date}T00:00:00.000Z`,
  );

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !==
      date
  ) {
    throw new BadRequestException(
      'Dato skal være en gyldig kalenderdato.',
    );
  }

  return parsedDate;
}

export function getMonthPlanRange(
  year: number,
  month: number,
) {
  const start = new Date(
    Date.UTC(year, month - 1, 1, 0, 0, 0, 0),
  );
  const end = new Date(
    Date.UTC(year, month, 1, 0, 0, 0, 0),
  );
  const dayCount = new Date(
    Date.UTC(year, month, 0),
  ).getUTCDate();

  return {
    start,
    end,
    dayCount,
  };
}

export function toIsoDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function parseOptionalBoolean(
  value: unknown,
  fieldName: string,
) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw new BadRequestException(
      `${fieldName} skal være sand/falsk.`,
    );
  }

  return value;
}

export function parseOptionalText(
  value: unknown,
  fieldName: string,
) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException(
      `${fieldName} skal være tekst.`,
    );
  }

  const trimmed = value.trim();

  if (
    trimmed.length > MAX_MONTH_PLAN_TEXT_LENGTH ||
    trimmed.includes('\u0000')
  ) {
    throw new BadRequestException(
      `${fieldName} er for lang eller ugyldig.`,
    );
  }

  return trimmed.length > 0
    ? trimmed
    : null;
}

export function parseOptionalPositiveId(
  value: unknown,
  fieldName: string,
) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  return parseStrictInteger(
    value,
    1,
    Number.MAX_SAFE_INTEGER,
    `${fieldName} skal være et gyldigt ID.`,
  );
}

export function parseOptionalCount(
  value: unknown,
  fieldName: string,
) {
  if (value === undefined) {
    return undefined;
  }

  return parseStrictInteger(
    value,
    0,
    MAX_MONTH_PLAN_COUNT,
    `${fieldName} skal være et positivt heltal.`,
  );
}

export function parseOptionalDateTime(
  value: unknown,
  fieldName: string,
) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new BadRequestException(
        `${fieldName} skal være et gyldigt tidspunkt.`,
      );
    }

    return new Date(value.getTime());
  }

  if (
    typeof value !== 'string' ||
    value !== value.trim() ||
    value.length === 0 ||
    value.length > MAX_DATE_TIME_INPUT_LENGTH
  ) {
    throw new BadRequestException(
      `${fieldName} skal være et gyldigt tidspunkt med tidszone.`,
    );
  }

  const match =
    ISO_DATE_TIME_WITH_ZONE.exec(value);

  if (
    !match ||
    !hasValidDateTimeComponents(match)
  ) {
    throw new BadRequestException(
      `${fieldName} skal være et gyldigt tidspunkt med tidszone.`,
    );
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new BadRequestException(
      `${fieldName} skal være et gyldigt tidspunkt med tidszone.`,
    );
  }

  return parsedDate;
}

export async function ensureScheduleTemplateForMonthPlan(
  prisma: MonthPlanDbClient,
  cinemaId: number,
  scheduleTemplateId:
    | number
    | null
    | undefined,
) {
  if (
    scheduleTemplateId === undefined ||
    scheduleTemplateId === null
  ) {
    return;
  }

  const template =
    await prisma.scheduleTemplate.findFirst({
      where: {
        id: scheduleTemplateId,
        cinemaId,
        isActive: true,
        archivedAt: null,
      },
      select: {
        id: true,
      },
    });

  if (!template) {
    throw new BadRequestException(
      'Vagtsskabelonen findes ikke for den valgte biograf.',
    );
  }
}

export async function withMonthPlanCinemaLock<T>(
  prisma: PrismaService,
  cinemaId: number,
  action: (
    transaction: MonthPlanDbClient,
  ) => Promise<T>,
) {
  return prisma.$transaction(
    async (transaction) => {
      await transaction.$executeRaw`
        SELECT pg_advisory_xact_lock(
          ${MONTH_PLAN_LOCK_NAMESPACE},
          ${cinemaId}
        )
      `;

      return action(transaction);
    },
  );
}

export function buildVirtualMonthPlanDay(
  cinemaId: number,
  date: Date,
  persistedDay?: any,
) {
  if (persistedDay) {
    return {
      ...persistedDay,
      dateKey: toIsoDateOnly(
        persistedDay.date,
      ),
      isPersisted: true,
    };
  }

  return {
    id: null,
    cinemaId,
    date,
    dateKey: toIsoDateOnly(date),
    isPersisted: false,
    isActive: true,
    scheduleTemplateId: null,
    scheduleTemplate: null,
    note: null,
    movieProgramFirstStart: null,
    movieProgramLastEnd: null,
    movieShowingCount: 0,
    plannedShiftCount: 0,
    unassignedShiftCount: 0,
    createdAt: null,
    updatedAt: null,
  };
}
