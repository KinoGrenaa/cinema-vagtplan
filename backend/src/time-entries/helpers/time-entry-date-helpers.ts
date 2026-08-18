import { BadRequestException } from '@nestjs/common';

import { getCopenhagenDateKey } from '../../shift-planning-drafts/shift-planning-time-zone';

export function parseRequiredTimeEntryDate(
  value: string,
  invalidMessage: string,
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(invalidMessage);
  }

  return date;
}

export function parseOptionalTimeEntryDate(
  value: string | null | undefined,
  invalidMessage: string,
) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(invalidMessage);
  }

  return date;
}

export function parseNullableTimeEntryDate(
  value: string | null | undefined,
  invalidMessage: string,
) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(invalidMessage);
  }

  return date;
}

export function ensureTimeEntryActionOnCopenhagenToday(
  value: Date,
  message: string,
  now: Date = new Date(),
) {
  if (
    getCopenhagenDateKey(value) !==
    getCopenhagenDateKey(now)
  ) {
    throw new BadRequestException(
      message,
    );
  }
}

export function ensureClockInShiftOnCopenhagenToday(
  shift: {
    startTime: Date;
  } | null,
  now: Date = new Date(),
) {
  if (!shift) {
    throw new BadRequestException(
      'Der blev ikke fundet en relevant vagt p\u00e5 dags dato',
    );
  }

  ensureTimeEntryActionOnCopenhagenToday(
    shift.startTime,
    'Du kan kun registrere m\u00f8detid p\u00e5 vagter p\u00e5 dags dato',
    now,
  );
}

export function ensureClockOutAfterClockIn(
  clockIn: Date,
  clockOut: Date | null | undefined,
) {
  if (clockOut && clockOut <= clockIn) {
    throw new BadRequestException('Fyraften skal være efter mødetid');
  }
}
