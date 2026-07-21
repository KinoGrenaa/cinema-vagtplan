import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { parseRequiredPositiveInteger } from '../../common/query-validation';

export function getAuthenticatedAuthUserId(value: unknown) {
  try {
    return parseRequiredPositiveInteger(
      value,
      'Brugeren kunne ikke identificeres',
    );
  } catch {
    throw new ForbiddenException(
      'Brugeren kunne ikke identificeres',
    );
  }
}

export function parseAuthCinemaId(value: unknown) {
  return parseRequiredPositiveInteger(
    value,
    'Biograf skal være et gyldigt ID',
  );
}

export function parseOptionalAuthCinemaId(value: unknown) {
  if (value === null) {
    return null;
  }

  if (value === undefined) {
    throw new BadRequestException(
      'Biograf skal være et gyldigt ID eller null',
    );
  }

  return parseAuthCinemaId(value);
}
