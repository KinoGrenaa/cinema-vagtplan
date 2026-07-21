import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

export type AuthUser = {
  sub: number;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number | null;
};

export type CinemaContextValue =
  | number
  | string
  | null
  | undefined;

export type MinuteContextValue =
  | number
  | string
  | null
  | undefined;

export type DayPeriodCreateData = {
  name: string;
  startMinute: MinuteContextValue;
  endMinute: MinuteContextValue;
  sortOrder?: MinuteContextValue;
  cinemaId?: CinemaContextValue;
};

export type DayPeriodUpdateData = {
  name?: string;
  startMinute?: MinuteContextValue;
  endMinute?: MinuteContextValue;
  sortOrder?: MinuteContextValue;
  cinemaId?: CinemaContextValue;
};

export function ensureDayPeriodAdmin(user: AuthUser) {
  if (user.role === 'MASTER') return;
  if (user.role === 'ADMIN') return;

  throw new ForbiddenException('Ingen adgang');
}

function parseStrictInteger(
  value: unknown,
  minimum: number,
  maximum: number,
  message: string,
) {
  if (
    (typeof value !== 'string' && typeof value !== 'number') ||
    (typeof value === 'string' && !/^[0-9]+$/.test(value))
  ) {
    throw new BadRequestException(message);
  }

  const parsedValue = Number(value);

  if (
    !Number.isSafeInteger(parsedValue) ||
    parsedValue < minimum ||
    parsedValue > maximum
  ) {
    throw new BadRequestException(message);
  }

  return parsedValue;
}

function parseCinemaId(value: CinemaContextValue) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  try {
    return parseStrictInteger(
      value,
      1,
      Number.MAX_SAFE_INTEGER,
      'Biograf skal være et gyldigt ID.',
    );
  } catch {
    return null;
  }
}

export function getRequiredDayPeriodCinemaId(
  user: AuthUser,
  selectedCinemaId?: CinemaContextValue,
) {
  if (user.role === 'MASTER') {
    const cinemaId = parseCinemaId(selectedCinemaId);

    if (!cinemaId) {
      throw new BadRequestException(
        'Vælg en biograf, før du administrerer dagsperioder.',
      );
    }

    return cinemaId;
  }

  const cinemaId = parseCinemaId(user.cinemaId);

  if (!cinemaId) {
    throw new BadRequestException('Brugeren mangler biograf.');
  }

  return cinemaId;
}

export function normalizeDayPeriodName(name: unknown) {
  if (typeof name !== 'string') {
    throw new BadRequestException('Navn mangler.');
  }

  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new BadRequestException('Navn mangler.');
  }

  return normalizedName;
}

export function parseRequiredMinute(
  value: MinuteContextValue,
  message: string,
) {
  if (value === null || value === undefined || value === '') {
    throw new BadRequestException(message);
  }

  return parseStrictInteger(value, 0, 1439, message);
}

export function parseOptionalSortOrder(
  value: MinuteContextValue,
) {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  return parseStrictInteger(
    value,
    0,
    Number.MAX_SAFE_INTEGER,
    'Sortering skal være et gyldigt tal.',
  );
}

export function ensureDayPeriodRange(
  startMinute: number,
  endMinute: number,
) {
  if (endMinute <= startMinute) {
    throw new BadRequestException(
      'Starttidspunkt skal være før sluttidspunkt.',
    );
  }
}
