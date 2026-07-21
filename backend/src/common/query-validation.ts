import { BadRequestException } from '@nestjs/common';

function parsePositiveInteger(value: unknown, message: string) {
  if (
    (typeof value !== 'string' && typeof value !== 'number') ||
    (typeof value === 'string' && !/^[0-9]+$/.test(value))
  ) {
    throw new BadRequestException(message);
  }

  const parsedValue = Number(value);
  if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
    throw new BadRequestException(message);
  }

  return parsedValue;
}

export function parseRequiredPositiveInteger(
  value: unknown,
  message: string,
) {
  return parsePositiveInteger(value, message);
}

export function parseOptionalPositiveIntegerQuery(
  value: unknown,
  message: string,
) {
  if (value === undefined) {
    return undefined;
  }

  return parsePositiveInteger(value, message);
}

export function parseOptionalBooleanQuery(
  value: unknown,
  message: string,
) {
  if (value === undefined) {
    return false;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new BadRequestException(message);
}

export function parseRequiredIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
  message: string,
) {
  const parsedValue = parsePositiveInteger(value, message);
  if (parsedValue < minimum || parsedValue > maximum) {
    throw new BadRequestException(message);
  }

  return parsedValue;
}
