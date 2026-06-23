type PayrollReferenceEntry = {
  clockIn: Date;
  shift?: { startTime: Date } | null;
};

type PayrollPeriodCinema = {
  payrollPeriodModel?: string | null;
  payrollPeriodAnchorDate?: Date | null;
  payrollPeriodStartDay?: number | null;
  payrollPeriodEndDay?: number | null;
};

export function getPeriodDates(startDate: string, endDate: string) {
  return {
    start: new Date(`${startDate}T00:00:00.000Z`),
    end: new Date(`${endDate}T23:59:59.999Z`),
  };
}

function dateToDateString(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function dateToCopenhagenDateString(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return dateToDateString(date);
  }

  return `${year}-${month}-${day}`;
}

export function getPayrollReferenceDate(entry: PayrollReferenceEntry) {
  return entry.shift?.startTime ?? entry.clockIn;
}

export function getPayrollReferenceDateFilters(start: Date, end: Date) {
  return [
    {
      shift: {
        is: {
          startTime: {
            gte: start,
            lte: end,
          },
        },
      },
    },
    {
      shiftId: null,
      clockIn: {
        gte: start,
        lte: end,
      },
    },
  ];
}

function createUtcDate(year: number, month: number, day: number) {
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
  return Math.min(Math.max(day, 1), getDaysInMonth(year, month));
}

export function calculatePayrollPeriodForDate(
  cinema: PayrollPeriodCinema,
  referenceDate: Date,
) {
  const model = cinema.payrollPeriodModel || 'CALENDAR_MONTH';

  const reference = createUtcDate(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate(),
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

    const msPerDay = 24 * 60 * 60 * 1000;
    const daysSinceAnchor = Math.floor(
      (reference.getTime() - anchor.getTime()) / msPerDay,
    );

    const cycleOffset = Math.floor(daysSinceAnchor / 14) * 14;
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
      clampDay(reference.getUTCFullYear(), reference.getUTCMonth(), startDay),
    );

    const end = createUtcDate(
      reference.getUTCFullYear(),
      reference.getUTCMonth(),
      clampDay(reference.getUTCFullYear(), reference.getUTCMonth(), endDay),
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
    clampDay(startMonth.getUTCFullYear(), startMonth.getUTCMonth(), startDay),
  );

  const end = createUtcDate(
    endMonth.getUTCFullYear(),
    endMonth.getUTCMonth(),
    clampDay(endMonth.getUTCFullYear(), endMonth.getUTCMonth(), endDay),
  );

  return {
    startDate: dateToDateString(start),
    endDate: dateToDateString(end),
  };
}
