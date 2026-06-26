import { BadRequestException } from '@nestjs/common';

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

export function ensureClockOutAfterClockIn(
  clockIn: Date,
  clockOut: Date | null | undefined,
) {
  if (clockOut && clockOut <= clockIn) {
    throw new BadRequestException('Fyraften skal være efter mødetid');
  }
}
