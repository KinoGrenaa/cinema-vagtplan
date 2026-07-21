import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { UserRole } from './user-service-helpers';

type UserCinemaValidationClient = Pick<
  Prisma.TransactionClient,
  'cinema'
>;

export async function ensureCinemaExists(
  prisma: UserCinemaValidationClient,
  cinemaId: number,
) {
  const cinema = await prisma.cinema.findUnique({
    where: {
      id: cinemaId,
    },
    select: {
      id: true,
    },
  });

  if (!cinema) {
    throw new BadRequestException(
      'Den valgte biograf blev ikke fundet',
    );
  }
}

export async function validateRoleCinema(
  prisma: UserCinemaValidationClient,
  role: UserRole,
  cinemaId?: number | null,
) {
  if (role === 'MASTER') {
    return null;
  }

  if (!cinemaId) {
    throw new BadRequestException(
      'Admin og medarbejdere skal tilknyttes en biograf',
    );
  }

  await ensureCinemaExists(
    prisma,
    cinemaId,
  );

  return cinemaId;
}
