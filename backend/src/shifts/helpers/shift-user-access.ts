import { ForbiddenException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export async function ensureShiftUserHasCinemaAccess(
  prisma: PrismaService,
  userId: number,
  cinemaId: number,
) {
  const shiftUser = await prisma.user.findFirst({
    where: {
      id: userId,
      isActive: true,
      OR: [
        {
          cinemaId,
        },
        {
          cinemaMemberships: {
            some: {
              cinemaId,
              isActive: true,
            },
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  if (!shiftUser) {
    throw new ForbiddenException(
      'Medarbejderen er ikke aktivt tilknyttet denne biograf',
    );
  }
}
