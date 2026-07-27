const COPENHAGEN_TIME_ZONE = 'Europe/Copenhagen';
const MINUTES_PER_DAY = 24 * 60;
const MILLISECONDS_PER_MINUTE = 60 * 1000;
const MILLISECONDS_PER_HOUR = 60 * MILLISECONDS_PER_MINUTE;

const copenhagenFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: COPENHAGEN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function toDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new RangeError('Ugyldigt tidspunkt.');
  }

  return date;
}

function getCopenhagenParts(value: Date | string): DateTimeParts {
  const date = toDate(value);
  const values = new Map(
    copenhagenFormatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );

  const parts = {
    year: values.get('year'),
    month: values.get('month'),
    day: values.get('day'),
    hour: values.get('hour'),
    minute: values.get('minute'),
    second: values.get('second'),
  };

  if (Object.values(parts).some((part) => !Number.isInteger(part))) {
    throw new RangeError('Kunne ikke fortolke tidspunktet i København.');
  }

  return parts as DateTimeParts;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function parseDateKey(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);

  if (!match) {
    throw new RangeError('Datoen skal være i formatet YYYY-MM-DD.');
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
    throw new RangeError('Datoen findes ikke.');
  }

  return { year, month, day };
}

function addDaysToDateKey(dateKey: string, days: number) {
  const { year, month, day } = parseDateKey(dateKey);
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return formatDateKey(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

function getOffsetMilliseconds(value: Date) {
  const parts = getCopenhagenParts(value);
  const valueWithoutMilliseconds =
    Math.trunc(value.getTime() / 1000) * 1000;
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return representedAsUtc - valueWithoutMilliseconds;
}

function sameParts(first: DateTimeParts, second: DateTimeParts) {
  return (
    first.year === second.year &&
    first.month === second.month &&
    first.day === second.day &&
    first.hour === second.hour &&
    first.minute === second.minute &&
    first.second === second.second
  );
}

function copenhagenDateTimeToUtc(parts: DateTimeParts) {
  const localValueAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  const sampleOffsets = new Set<number>();

  for (const hourOffset of [-36, -12, 0, 12, 36]) {
    sampleOffsets.add(
      getOffsetMilliseconds(
        new Date(localValueAsUtc + hourOffset * MILLISECONDS_PER_HOUR),
      ),
    );
  }

  const matches = Array.from(sampleOffsets)
    .map((offset) => new Date(localValueAsUtc - offset))
    .filter((candidate) => sameParts(getCopenhagenParts(candidate), parts))
    .sort((first, second) => first.getTime() - second.getTime());

  if (matches.length === 0) {
    throw new RangeError(
      'Det lokale tidspunkt findes ikke i Europe/Copenhagen på grund af sommertid.',
    );
  }

  return matches[0];
}

export function getCopenhagenDateKey(value: Date | string) {
  const parts = getCopenhagenParts(value);
  return formatDateKey(parts.year, parts.month, parts.day);
}

export function getCopenhagenMinuteOfDay(value: Date | string) {
  const parts = getCopenhagenParts(value);
  return parts.hour * 60 + parts.minute;
}

export function buildCopenhagenDateTimeFromMinute(
  dateValue: Date | string,
  minuteValue: number,
) {
  if (!Number.isInteger(minuteValue) || minuteValue < 0) {
    throw new RangeError('Minuttallet skal være et ikke-negativt heltal.');
  }

  const logicalDate = toDate(dateValue);
  const dateKey = formatDateKey(
    logicalDate.getUTCFullYear(),
    logicalDate.getUTCMonth() + 1,
    logicalDate.getUTCDate(),
  );
  const dayOffset = Math.floor(minuteValue / MINUTES_PER_DAY);
  const minuteOfDay = minuteValue % MINUTES_PER_DAY;
  const targetDateKey = addDaysToDateKey(dateKey, dayOffset);
  const targetDate = parseDateKey(targetDateKey);

  return copenhagenDateTimeToUtc({
    ...targetDate,
    hour: Math.floor(minuteOfDay / 60),
    minute: minuteOfDay % 60,
    second: 0,
  });
}

export function getCopenhagenDayInstantRange(dateKey: string) {
  const startDate = parseDateKey(dateKey);
  const nextDate = parseDateKey(addDaysToDateKey(dateKey, 1));

  return {
    start: copenhagenDateTimeToUtc({
      ...startDate,
      hour: 0,
      minute: 0,
      second: 0,
    }),
    end: copenhagenDateTimeToUtc({
      ...nextDate,
      hour: 0,
      minute: 0,
      second: 0,
    }),
  };
}

export function getCopenhagenMonthInstantRange(year: number, month: number) {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new RangeError('Ugyldigt år eller måned.');
  }

  const startDateKey = formatDateKey(year, month, 1);
  const nextMonth = new Date(Date.UTC(year, month, 1));
  const endDateKey = formatDateKey(
    nextMonth.getUTCFullYear(),
    nextMonth.getUTCMonth() + 1,
    1,
  );
  const startDate = parseDateKey(startDateKey);
  const endDate = parseDateKey(endDateKey);

  return {
    start: copenhagenDateTimeToUtc({
      ...startDate,
      hour: 0,
      minute: 0,
      second: 0,
    }),
    end: copenhagenDateTimeToUtc({
      ...endDate,
      hour: 0,
      minute: 0,
      second: 0,
    }),
  };
}
