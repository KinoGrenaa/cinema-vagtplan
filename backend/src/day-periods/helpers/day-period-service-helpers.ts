import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';

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

export type DayPeriodDbClient =
  Prisma.TransactionClient;

const DAY_PERIOD_LOCK_NAMESPACE = 1_145_052_962;
const MAX_DAY_PERIOD_NAME_LENGTH = 200;

function parseStrictInteger(
  value: unknown,
  minimum: number,
  maximum: number,
  message: string,
) {
  if (
    (typeof value !== 'string' &&
      typeof value !== 'number') ||
    (typeof value === 'string' &&
      !/^[0-9]+$/.test(value))
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

function parseCinemaId(
  value: CinemaContextValue,
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
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

export function ensureDayPeriodAdmin(
  user: AuthUser,
) {
  if (user.role === 'MASTER') return;
  if (user.role === 'ADMIN') return;

  throw new ForbiddenException('Ingen adgang');
}

export function getRequiredDayPeriodCinemaId(
  user: AuthUser,
  selectedCinemaId?: CinemaContextValue,
) {
  if (user.role === 'MASTER') {
    const cinemaId = parseCinemaId(
      selectedCinemaId,
    );

    if (!cinemaId) {
      throw new BadRequestException(
        'Vælg en biograf, før du administrerer dagsperioder.',
      );
    }

    return cinemaId;
  }

  const cinemaId = parseCinemaId(user.cinemaId);

  if (!cinemaId) {
    throw new BadRequestException(
      'Brugeren mangler biograf.',
    );
  }

  return cinemaId;
}

export function normalizeDayPeriodName(
  name: unknown,
) {
  if (typeof name !== 'string') {
    throw new BadRequestException('Navn mangler.');
  }

  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new BadRequestException('Navn mangler.');
  }

  if (
    normalizedName.length >
      MAX_DAY_PERIOD_NAME_LENGTH ||
    /[\u0000-\u001f\u007f]/.test(
      normalizedName,
    )
  ) {
    throw new BadRequestException(
      'Navnet er for langt eller indeholder ugyldige tegn.',
    );
  }

  return normalizedName;
}

export function parseRequiredMinute(
  value: MinuteContextValue,
  message: string,
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    throw new BadRequestException(message);
  }

  return parseStrictInteger(
    value,
    0,
    1439,
    message,
  );
}

export function parseOptionalSortOrder(
  value: MinuteContextValue,
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
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

export async function findDayPeriodForCinema(
  prisma: DayPeriodDbClient,
  id: number,
  cinemaId: number,
) {
  const dayPeriod =
    await prisma.dayPeriod.findFirst({
      where: {
        id,
        cinemaId,
      },
    });

  if (!dayPeriod) {
    throw new NotFoundException(
      'Dagsperioden findes ikke for den valgte biograf.',
    );
  }

  return dayPeriod;
}

export async function withDayPeriodCinemaLock<T>(
  prisma: PrismaService,
  cinemaId: number,
  action: (
    transaction: DayPeriodDbClient,
  ) => Promise<T>,
) {
  return prisma.$transaction(
    async (transaction) => {
      await transaction.$executeRaw`
        SELECT pg_advisory_xact_lock(
          ${DAY_PERIOD_LOCK_NAMESPACE}::integer,
          ${cinemaId}::integer
        )
      `;

      return action(transaction);
    },
  );
}
