import { BadRequestException, ForbiddenException } from '@nestjs/common';

import type { PrismaService } from '../../prisma/prisma.service';

export type AuthUser = {
  sub: number;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number | null;
};

export type CinemaContextValue = number | string | null | undefined;

export function ensureWorkTypeAdmin(user: AuthUser) {
  if (user.role === 'MASTER') return;
  if (user.role === 'ADMIN') return;

  throw new ForbiddenException('Ingen adgang');
}

function parseCinemaId(value: CinemaContextValue) {
  const cinemaId = Number(value);

  if (!Number.isFinite(cinemaId) || cinemaId <= 0) {
    return null;
  }

  return cinemaId;
}

export function getRequiredWorkTypeCinemaId(
  user: AuthUser,
  selectedCinemaId?: CinemaContextValue,
) {
  if (user.role === 'MASTER') {
    const cinemaId = parseCinemaId(selectedCinemaId);

    if (!cinemaId) {
      throw new BadRequestException(
        'Vælg en biograf, før du administrerer vagttyper.',
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

export async function getPayrollTypeIdForCinema(
  prisma: PrismaService,
  cinemaId: number,
  payrollTypeId?: number | null,
) {
  if (!payrollTypeId) {
    return null;
  }

  const payrollType = await prisma.payrollType.findFirst({
    where: {
      id: payrollTypeId,
      cinemaId,
    },
  });

  if (!payrollType) {
    throw new BadRequestException(
      'Lønarten blev ikke fundet for den valgte biograf.',
    );
  }

  return payrollType.id;
}
