import { BadRequestException } from '@nestjs/common';
import {
  parseOptionalPositiveIntegerQuery,
  parseRequiredPositiveInteger,
} from '../../common/query-validation';

export function parsePayrollRequiredId(
  value: unknown,
  message: string,
) {
  return parseRequiredPositiveInteger(value, message);
}

export function parsePayrollOptionalQueryId(
  value: unknown,
  message: string,
) {
  return parseOptionalPositiveIntegerQuery(value, message);
}

export function parsePayrollOptionalBodyId(
  value: unknown,
  message: string,
) {
  if (value === undefined || value === null) {
    return undefined;
  }

  return parseRequiredPositiveInteger(value, message);
}

export function normalizePayrollDate(
  value: unknown,
  message = 'Dato skal være gyldig',
) {
  if (typeof value !== 'string') {
    throw new BadRequestException(message);
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    throw new BadRequestException(message);
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
    throw new BadRequestException(message);
  }

  return value;
}

export function normalizePayrollPeriod(
  startDate: unknown,
  endDate: unknown,
) {
  const normalizedStartDate = normalizePayrollDate(
    startDate,
    'Startdato skal være en gyldig dato',
  );
  const normalizedEndDate = normalizePayrollDate(
    endDate,
    'Slutdato skal være en gyldig dato',
  );

  if (normalizedStartDate > normalizedEndDate) {
    throw new BadRequestException(
      'Startdato skal være før eller lig med slutdato',
    );
  }

  return {
    startDate: normalizedStartDate,
    endDate: normalizedEndDate,
  };
}
