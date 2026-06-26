import { BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from './user-service-helpers';

export async function ensureCinemaExists(
  prisma: PrismaService,
  cinemaId: number,
) {
  const cinema = await prisma.cinema.findUnique({
    where: { id: cinemaId },
    select: { id: true },
  });

  if (!cinema) {
    throw new BadRequestException('Den valgte biograf blev ikke fundet');
  }
}

export async function validateRoleCinema(
  prisma: PrismaService,
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

  await ensureCinemaExists(prisma, cinemaId);

  return cinemaId;
}
