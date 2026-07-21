import { BadRequestException } from '@nestjs/common';
import { parseRequiredPositiveInteger } from '../common/query-validation';

const MAX_DATE_INPUT_LENGTH = 64;
const ISO_DATE_TIME_WITH_ZONE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-](\d{2}):(\d{2}))$/;

function isLeapYear(year: number) {
  return (
    year % 4 === 0 &&
    (year % 100 !== 0 || year % 400 === 0)
  );
}

function getDaysInMonth(year: number, month: number) {
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

function hasValidDateTimeComponents(match: RegExpExecArray) {
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second =
    match[6] === undefined ? 0 : Number(match[6]);
  const offsetHour =
    match[9] === undefined ? 0 : Number(match[9]);
  const offsetMinute =
    match[10] === undefined ? 0 : Number(match[10]);

  return (
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
    offsetHour <= 23 &&
    offsetMinute >= 0 &&
    offsetMinute <= 59
  );
}

export function parseStaffingAiId(
  value: unknown,
  message: string,
) {
  return parseRequiredPositiveInteger(value, message);
}

export function parseStaffingAiDate(
  value: unknown,
  message: string,
) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new BadRequestException(message);
    }

    return new Date(value.getTime());
  }

  if (
    typeof value !== 'string' ||
    value !== value.trim() ||
    value.length === 0 ||
    value.length > MAX_DATE_INPUT_LENGTH
  ) {
    throw new BadRequestException(message);
  }

  const match = ISO_DATE_TIME_WITH_ZONE.exec(value);

  if (!match || !hasValidDateTimeComponents(match)) {
    throw new BadRequestException(message);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(message);
  }

  return date;
}

export function parseStaffingAiDateRange(
  startTime: unknown,
  endTime: unknown,
) {
  const start = parseStaffingAiDate(
    startTime,
    'Starttid skal være en gyldig dato med tidszone',
  );
  const end = parseStaffingAiDate(
    endTime,
    'Sluttid skal være en gyldig dato med tidszone',
  );

  if (end.getTime() <= start.getTime()) {
    throw new BadRequestException(
      'Sluttid skal være efter starttid',
    );
  }

  return {
    start,
    end,
  };
}

export function parseStaffingAiLimit(value: unknown) {
  const limit = parseRequiredPositiveInteger(
    value,
    'Antal kandidater skal være et positivt heltal',
  );

  return Math.min(limit, 20);
}
