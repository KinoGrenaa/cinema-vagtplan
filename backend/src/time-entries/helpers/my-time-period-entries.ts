import {
  BadRequestException,
} from '@nestjs/common';
import {
  Prisma,
} from '@prisma/client';

import {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  getTimeEntryActorUserId,
  resolveTimeEntryActorCinemaId,
} from './time-entry-cinema-access';
import {
  getTimeEntryResponseInclude,
} from './time-entry-includes';
import {
  withTimeEntryDeviation,
} from './time-entry-deviation';
import {
  withTimeEntryPayrollExportContext,
} from './time-entry-payroll-export-context';

const DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}$/;
const COPENHAGEN_TIME_ZONE =
  'Europe/Copenhagen';
const MAX_PERIOD_DAYS = 62;

const copenhagenDateTimeFormatter =
  new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone:
        COPENHAGEN_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    },
  );

type MyTimePeriodOptions = {
  startDate?: string;
  endDate?: string;
};

function getDateTimePart(
  parts:
    Intl.DateTimeFormatPart[],
  type:
    Intl.DateTimeFormatPartTypes,
) {
  const value =
    Number(
      parts.find(
        (part) =>
          part.type === type,
      )?.value,
    );

  if (
    !Number.isInteger(value)
  ) {
    throw new Error(
      `Kunne ikke beregne dansk datogrænse: ${type}`,
    );
  }

  return value;
}

function getCopenhagenOffsetMilliseconds(
  date: Date,
) {
  const parts =
    copenhagenDateTimeFormatter.formatToParts(
      date,
    );
  const formattedAsUtc =
    Date.UTC(
      getDateTimePart(
        parts,
        'year',
      ),
      getDateTimePart(
        parts,
        'month',
      ) - 1,
      getDateTimePart(
        parts,
        'day',
      ),
      getDateTimePart(
        parts,
        'hour',
      ),
      getDateTimePart(
        parts,
        'minute',
      ),
      getDateTimePart(
        parts,
        'second',
      ),
    );
  const withoutMilliseconds =
    Math.floor(
      date.getTime() /
        1000,
    ) * 1000;

  return (
    formattedAsUtc -
    withoutMilliseconds
  );
}

export function getMyTimeCopenhagenDateStart(
  value: string,
  dayOffset = 0,
) {
  if (
    !DATE_PATTERN.test(value)
  ) {
    throw new BadRequestException(
      'Dato skal have formatet YYYY-MM-DD',
    );
  }

  const [
    year,
    month,
    day,
  ] = value
    .split('-')
    .map(Number);

  const baseDate =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        0,
        0,
        0,
      ),
    );

  if (
    Number.isNaN(
      baseDate.getTime(),
    ) ||
    baseDate.getUTCFullYear() !==
      year ||
    baseDate.getUTCMonth() !==
      month - 1 ||
    baseDate.getUTCDate() !==
      day
  ) {
    throw new BadRequestException(
      'Dato er ugyldig',
    );
  }

  const utcGuess =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day + dayOffset,
        0,
        0,
        0,
      ),
    );

  let offset =
    getCopenhagenOffsetMilliseconds(
      utcGuess,
    );
  let result =
    new Date(
      utcGuess.getTime() -
        offset,
    );
  const correctedOffset =
    getCopenhagenOffsetMilliseconds(
      result,
    );

  if (
    correctedOffset !==
    offset
  ) {
    offset =
      correctedOffset;
    result =
      new Date(
        utcGuess.getTime() -
          offset,
      );
  }

  return result;
}

export function resolveMyTimePeriod(
  options:
    MyTimePeriodOptions,
) {
  if (
    !options.startDate ||
    !options.endDate
  ) {
    throw new BadRequestException(
      'Start- og slutdato er påkrævet',
    );
  }

  const start =
    getMyTimeCopenhagenDateStart(
      options.startDate,
    );
  const endExclusive =
    getMyTimeCopenhagenDateStart(
      options.endDate,
      1,
    );

  if (
    endExclusive <= start
  ) {
    throw new BadRequestException(
      'Slutdato skal være efter eller lig med startdato',
    );
  }

  const maximumEndExclusive =
    getMyTimeCopenhagenDateStart(
      options.startDate,
      MAX_PERIOD_DAYS,
    );

  if (
    endExclusive >
    maximumEndExclusive
  ) {
    throw new BadRequestException(
      `Perioden må højst være ${MAX_PERIOD_DAYS} dage`,
    );
  }

  return {
    start,
    endExclusive,
  };
}

export function buildMyTimePeriodWhere(
  userId: number,
  cinemaId: number,
  start: Date,
  endExclusive: Date,
): Prisma.TimeEntryWhereInput {
  return {
    userId,
    cinemaId,
    OR: [
      {
        shiftId: {
          not: null,
        },
        shift: {
          startTime: {
            gte: start,
            lt: endExclusive,
          },
        },
      },
      {
        shiftId: null,
        clockIn: {
          gte: start,
          lt: endExclusive,
        },
      },
    ],
  };
}

function withMyTimeReadContext(
  entry: any,
) {
  return withTimeEntryPayrollExportContext(
    withTimeEntryDeviation(
      entry,
    ),
  );
}

export async function findMyTimePeriodEntries(
  prisma: PrismaService,
  user: any,
  options:
    MyTimePeriodOptions,
) {
  const userId =
    getTimeEntryActorUserId(
      user,
    );
  const cinemaId =
    await resolveTimeEntryActorCinemaId(
      prisma,
      user,
    );
  const {
    start,
    endExclusive,
  } =
    resolveMyTimePeriod(
      options,
    );

  const entries =
    await prisma.timeEntry.findMany({
      where:
        buildMyTimePeriodWhere(
          userId,
          cinemaId,
          start,
          endExclusive,
        ),
      include:
        getTimeEntryResponseInclude(),
      orderBy: {
        clockIn: 'desc',
      },
    });

  return entries.map(
    withMyTimeReadContext,
  );
}
