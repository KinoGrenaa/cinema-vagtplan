import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';

export type CinemaWriteDbClient =
  Prisma.TransactionClient;

const CINEMA_WRITE_LOCK_NAMESPACE = 1_129_664_877;

const MAX_CINEMA_NAME_LENGTH = 200;
const CINEMA_LOGO_URL_PATTERN =
  /^\/uploads\/cinema-logos\/[A-Za-z0-9][A-Za-z0-9._-]{0,254}\.(?:jpg|png|webp)$/;

export function normalizeCinemaName(
  value: unknown,
) {
  if (typeof value !== 'string') {
    throw new BadRequestException(
      'Biografnavn mangler',
    );
  }
  const name = value.trim();

  if (!name) {
    throw new BadRequestException(
      'Biografnavn mangler',
    );
  }

  if (
    name.length > MAX_CINEMA_NAME_LENGTH ||
    /[\u0000-\u001f\u007f]/.test(name)
  ) {
    throw new BadRequestException(
      'Biografnavnet er for langt eller indeholder ugyldige tegn',
    );
  }

  return name;
}

export function normalizeCinemaLogoUrl(
  value: unknown,
) {
  if (value === null) {
    return null;
  }

  if (
    typeof value !== 'string' ||
    !CINEMA_LOGO_URL_PATTERN.test(value)
  ) {
    throw new BadRequestException(
      'Logo-adressen er ugyldig',
    );
  }

  return value;
}

export async function findCinemaForWrite(
  prisma: CinemaWriteDbClient,
  id: number,
) {
  const cinema = await prisma.cinema.findUnique({
    where: {
      id,
    },
  });

  if (!cinema) {
    throw new NotFoundException(
      'Biograf blev ikke fundet',
    );
  }

  return cinema;
}

export async function ensureCinemaNameAvailable(
  prisma: CinemaWriteDbClient,
  name: string,
  excludeId?: number,
) {
  const duplicate =
    await prisma.cinema.findFirst({
      where: {
        name,
        ...(excludeId === undefined
          ? {}
          : {
              id: {
                not: excludeId,
              },
            }),
      },
      select: {
        id: true,
      },
    });

  if (duplicate) {
    throw new BadRequestException(
      'Der findes allerede en biograf med dette navn',
    );
  }
}

export async function withCinemaWriteLock<T>(
  prisma: PrismaService,
  action: (
    transaction: CinemaWriteDbClient,
  ) => Promise<T>,
) {
  return prisma.$transaction(
    async (transaction) => {
      await transaction.$executeRaw`
        SELECT pg_advisory_xact_lock(
          ${CINEMA_WRITE_LOCK_NAMESPACE}::integer,
          0::integer
        )
      `;

      return action(transaction);
    },
  );
}
