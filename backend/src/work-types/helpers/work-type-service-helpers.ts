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

export type NumberContextValue =
  | number
  | string
  | null
  | undefined;

export type WorkTypeDbClient =
  Prisma.TransactionClient;

export type WorkTypeData = {
  name?: unknown;
  color?: unknown;
  payrollTypeId?: NumberContextValue;
  cinemaId?: CinemaContextValue;
};

const WORK_TYPE_LOCK_NAMESPACE = 1_469_766_948;
const MAX_WORK_TYPE_NAME_LENGTH = 200;

export const workTypeInclude = {
  payrollType: true,
} as const;

function parseStrictPositiveInteger(
  value: unknown,
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
    parsedValue <= 0
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
    return parseStrictPositiveInteger(
      value,
      'Biograf skal være et gyldigt ID.',
    );
  } catch {
    return null;
  }
}

export function ensureWorkTypeAdmin(
  user: AuthUser,
) {
  if (user.role === 'MASTER') return;
  if (user.role === 'ADMIN') return;

  throw new ForbiddenException('Ingen adgang');
}

export function getRequiredWorkTypeCinemaId(
  user: AuthUser,
  selectedCinemaId?: CinemaContextValue,
) {
  if (user.role === 'MASTER') {
    const cinemaId = parseCinemaId(
      selectedCinemaId,
    );

    if (!cinemaId) {
      throw new BadRequestException(
        'Vælg en biograf, før du administrerer vagttyper.',
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

export function normalizeWorkTypeName(
  value: unknown,
) {
  if (typeof value !== 'string') {
    throw new BadRequestException('Navn mangler.');
  }

  const name = value.trim();

  if (!name) {
    throw new BadRequestException('Navn mangler.');
  }

  if (
    name.length > MAX_WORK_TYPE_NAME_LENGTH ||
    /[\u0000-\u001f\u007f]/.test(name)
  ) {
    throw new BadRequestException(
      'Navnet er for langt eller indeholder ugyldige tegn.',
    );
  }

  return name;
}

export function normalizeWorkTypeColor(
  value: unknown,
) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException(
      'Farve skal være en gyldig hex-farve.',
    );
  }

  const color = value.trim();

  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new BadRequestException(
      'Farve skal være en gyldig hex-farve.',
    );
  }

  return color;
}

export function parseOptionalPayrollTypeId(
  value: NumberContextValue,
) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  return parseStrictPositiveInteger(
    value,
    'Lønart skal være et gyldigt ID.',
  );
}

export async function getPayrollTypeIdForCinema(
  prisma: WorkTypeDbClient,
  cinemaId: number,
  payrollTypeId: NumberContextValue,
) {
  const parsedPayrollTypeId =
    parseOptionalPayrollTypeId(payrollTypeId);

  if (
    parsedPayrollTypeId === undefined ||
    parsedPayrollTypeId === null
  ) {
    return parsedPayrollTypeId ?? null;
  }

  const payrollType =
    await prisma.payrollType.findFirst({
      where: {
        id: parsedPayrollTypeId,
        cinemaId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

  if (!payrollType) {
    throw new BadRequestException(
      'En aktiv lønart blev ikke fundet for den valgte biograf.',
    );
  }

  return payrollType.id;
}

export async function findWorkTypeForCinema(
  prisma: WorkTypeDbClient,
  id: number,
  cinemaId: number,
) {
  const workType = await prisma.workType.findFirst({
    where: {
      id,
      cinemaId,
    },
    include: workTypeInclude,
  });

  if (!workType) {
    throw new NotFoundException(
      'Vagttype blev ikke fundet',
    );
  }

  return workType;
}

export async function withWorkTypeCinemaLock<T>(
  prisma: PrismaService,
  cinemaId: number,
  action: (
    transaction: WorkTypeDbClient,
  ) => Promise<T>,
) {
  return prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`
      SELECT pg_advisory_xact_lock(
        ${WORK_TYPE_LOCK_NAMESPACE},
        ${cinemaId}
      )
    `;

    return action(transaction);
  });
}
