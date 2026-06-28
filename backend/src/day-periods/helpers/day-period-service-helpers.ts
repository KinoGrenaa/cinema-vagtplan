import { BadRequestException, ForbiddenException } from '@nestjs/common';

export type AuthUser = {
  sub: number;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number | null;
};

export type CinemaContextValue = number | string | null | undefined;
export type MinuteContextValue = number | string | null | undefined;

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

function parseCinemaId(value: CinemaContextValue) {
  const cinemaId = Number(value);

  if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
    return null;
  }

  return cinemaId;
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

export function parseRequiredMinute(value: MinuteContextValue, message: string) {
  if (value === null || value === undefined || value === '') {
    throw new BadRequestException(message);
  }

  const minute = Number(value);

  if (!Number.isInteger(minute) || minute < 0 || minute > 1439) {
    throw new BadRequestException(message);
  }

  return minute;
}

export function parseOptionalSortOrder(value: MinuteContextValue) {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const sortOrder = Number(value);

  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new BadRequestException('Sortering skal være et gyldigt tal.');
  }

  return sortOrder;
}

export function ensureDayPeriodRange(startMinute: number, endMinute: number) {
  if (endMinute <= startMinute) {
    throw new BadRequestException('Starttidspunkt skal være før sluttidspunkt.');
  }
}
