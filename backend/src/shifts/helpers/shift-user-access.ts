import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from './shift-service-helpers';

export async function ensureShiftActorHasCinemaAccess(
  prisma: PrismaService,
  user: AuthUser,
  cinemaId: number,
) {
  const actor = await prisma.user.findUnique({
    where: {
      id: user.sub,
    },
    select: {
      id: true,
      role: true,
      isActive: true,
      cinemaId: true,
      cinemaMemberships: {
        where: {
          cinemaId,
          isActive: true,
        },
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (
    !actor ||
    !actor.isActive ||
    actor.role !== user.role
  ) {
    throw new ForbiddenException(
      'Din session er ikke længere gyldig. Log ind igen.',
    );
  }

  if (user.role === 'MASTER') {
    const cinema = await prisma.cinema.findUnique({
      where: {
        id: cinemaId,
      },
      select: {
        id: true,
      },
    });

    if (!cinema) {
      throw new NotFoundException(
        'Biografen blev ikke fundet',
      );
    }

    return;
  }

  const hasCinemaAccess =
    actor.cinemaId === cinemaId ||
    actor.cinemaMemberships.length > 0;

  if (!hasCinemaAccess) {
    throw new ForbiddenException(
      'Du er ikke længere aktivt tilknyttet denne biograf',
    );
  }
}

export async function ensureShiftUserHasCinemaAccess(
  prisma: PrismaService,
  userId: number,
  cinemaId: number,
) {
  const shiftUser = await prisma.user.findFirst({
    where: {
      id: userId,
      isActive: true,
      role: {
        not: 'MASTER',
      },
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
