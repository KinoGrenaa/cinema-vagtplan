type PayrollReferenceEntry = {
  clockIn: Date;
  shift?: {
    startTime: Date;
  } | null;
};

type PayrollPeriodCinema = {
  payrollPeriodModel?: string | null;
  payrollPeriodAnchorDate?: Date | null;
  payrollPeriodStartDay?: number | null;
  payrollPeriodEndDay?: number | null;
};

const COPENHAGEN_TIME_ZONE = 'Europe/Copenhagen';

const copenhagenDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: COPENHAGEN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const copenhagenDateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: COPENHAGEN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

type DateParts = {
  year: number;
  month: number;
  day: number;
};

function getDateTimePart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
) {
  const value = Number(parts.find((part) => part.type === type)?.value);

  if (!Number.isInteger(value)) {
    throw new Error(`Kunne ikke beregne dansk lønperiodegrænse: ${type}`);
  }

  return value;
}

function parseDateString(dateString: string): DateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);

  if (!match) {
    throw new Error('Ugyldig lønperiodedato');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error('Ugyldig lønperiodedato');
  }

  return {
    year,
    month,
    day,
  };
}

function getCopenhagenOffsetMilliseconds(date: Date) {
  const parts = copenhagenDateTimeFormatter.formatToParts(date);
  const formattedAsUtc = Date.UTC(
    getDateTimePart(parts, 'year'),
    getDateTimePart(parts, 'month') - 1,
    getDateTimePart(parts, 'day'),
    getDateTimePart(parts, 'hour'),
    getDateTimePart(parts, 'minute'),
    getDateTimePart(parts, 'second'),
  );
  const dateWithoutMilliseconds =
    Math.floor(date.getTime() / 1000) * 1000;

  return formattedAsUtc - dateWithoutMilliseconds;
}

function getCopenhagenDayStart(parts: DateParts) {
  const utcGuess = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day),
  );
  const offsetMilliseconds =
    getCopenhagenOffsetMilliseconds(utcGuess);

  return new Date(utcGuess.getTime() - offsetMilliseconds);
}

function addCalendarDays(parts: DateParts, days: number): DateParts {
  const date = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + days),
  );

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

/**
 * Database keys remain UTC calendar-date markers.
 * Do not use these values as the actual Copenhagen time boundaries.
 */
export function getPeriodDates(
  startDate: string,
  endDate: string,
) {
  const startParts = parseDateString(startDate);
  const endParts = parseDateString(endDate);

  return {
    start: new Date(
      Date.UTC(
        startParts.year,
        startParts.month - 1,
        startParts.day,
        0,
        0,
        0,
        0,
      ),
    ),
    end: new Date(
      Date.UTC(
        endParts.year,
        endParts.month - 1,
        endParts.day,
        23,
        59,
        59,
        999,
      ),
    ),
  };
}

/**
 * Actual instants used for shift/time-entry filtering.
 * The end is exclusive so adjacent payroll periods cannot overlap.
 */
export function getPayrollPeriodTimeRange(
  startDate: string,
  endDate: string,
) {
  const startParts = parseDateString(startDate);
  const endExclusiveParts = addCalendarDays(
    parseDateString(endDate),
    1,
  );

  return {
    start: getCopenhagenDayStart(startParts),
    endExclusive: getCopenhagenDayStart(endExclusiveParts),
  };
}

function dateToDateString(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function dateToCopenhagenDateString(date: Date) {
  const parts = copenhagenDateFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return dateToDateString(date);
  }

  return `${year}-${month}-${day}`;
}

export function getPayrollReferenceDate(
  entry: PayrollReferenceEntry,
) {
  return entry.shift?.startTime ?? entry.clockIn;
}

export function getPayrollReferenceDateFilters(
  start: Date,
  endExclusive: Date,
) {
  return [
    {
      shift: {
        is: {
          startTime: {
            gte: start,
            lt: endExclusive,
          },
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
  ];
}

function createUtcDate(
  year: number,
  month: number,
  day: number,
) {
  return new Date(Date.UTC(year, month, day));
}

function addDays(date: Date, days: number) {
  return createUtcDate(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + days,
  );
}

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function clampDay(year: number, month: number, day: number) {
  return Math.min(
    Math.max(day, 1),
    getDaysInMonth(year, month),
  );
}

export function calculatePayrollPeriodForDate(
  cinema: PayrollPeriodCinema,
  referenceDate: Date,
) {
  const model = cinema.payrollPeriodModel || 'CALENDAR_MONTH';
  const referenceParts = parseDateString(
    dateToCopenhagenDateString(referenceDate),
  );
  const reference = createUtcDate(
    referenceParts.year,
    referenceParts.month - 1,
    referenceParts.day,
  );

  if (model === 'CALENDAR_MONTH') {
    const start = createUtcDate(
      reference.getUTCFullYear(),
      reference.getUTCMonth(),
      1,
    );
    const end = createUtcDate(
      reference.getUTCFullYear(),
      reference.getUTCMonth() + 1,
      0,
    );

    return {
      startDate: dateToDateString(start),
      endDate: dateToDateString(end),
    };
  }

  if (model === 'BIWEEKLY') {
    const anchor = cinema.payrollPeriodAnchorDate
      ? createUtcDate(
          cinema.payrollPeriodAnchorDate.getUTCFullYear(),
          cinema.payrollPeriodAnchorDate.getUTCMonth(),
          cinema.payrollPeriodAnchorDate.getUTCDate(),
        )
      : createUtcDate(
          reference.getUTCFullYear(),
          reference.getUTCMonth(),
          1,
        );
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const daysSinceAnchor = Math.floor(
      (reference.getTime() - anchor.getTime()) /
        millisecondsPerDay,
    );
    const cycleOffset =
      Math.floor(daysSinceAnchor / 14) * 14;
    const start = addDays(anchor, cycleOffset);
    const end = addDays(start, 13);

    return {
      startDate: dateToDateString(start),
      endDate: dateToDateString(end),
    };
  }

  const startDay = cinema.payrollPeriodStartDay || 1;
  const endDay = cinema.payrollPeriodEndDay || 31;
  const referenceDay = reference.getUTCDate();

  if (startDay <= endDay) {
    const start = createUtcDate(
      reference.getUTCFullYear(),
      reference.getUTCMonth(),
      clampDay(
        reference.getUTCFullYear(),
        reference.getUTCMonth(),
        startDay,
      ),
    );
    const end = createUtcDate(
      reference.getUTCFullYear(),
      reference.getUTCMonth(),
      clampDay(
        reference.getUTCFullYear(),
        reference.getUTCMonth(),
        endDay,
      ),
    );

    return {
      startDate: dateToDateString(start),
      endDate: dateToDateString(end),
    };
  }

  const startMonthOffset = referenceDay >= startDay ? 0 : -1;
  const endMonthOffset = referenceDay >= startDay ? 1 : 0;
  const startMonth = createUtcDate(
    reference.getUTCFullYear(),
    reference.getUTCMonth() + startMonthOffset,
    1,
  );
  const endMonth = createUtcDate(
    reference.getUTCFullYear(),
    reference.getUTCMonth() + endMonthOffset,
    1,
  );
  const start = createUtcDate(
    startMonth.getUTCFullYear(),
    startMonth.getUTCMonth(),
    clampDay(
      startMonth.getUTCFullYear(),
      startMonth.getUTCMonth(),
      startDay,
    ),
  );
  const end = createUtcDate(
    endMonth.getUTCFullYear(),
    endMonth.getUTCMonth(),
    clampDay(
      endMonth.getUTCFullYear(),
      endMonth.getUTCMonth(),
      endDay,
    ),
  );

  return {
    startDate: dateToDateString(start),
    endDate: dateToDateString(end),
  };
}
