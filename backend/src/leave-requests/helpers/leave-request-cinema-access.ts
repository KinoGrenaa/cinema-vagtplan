import { ForbiddenException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUser,
  requireUserId,
} from './leave-request-service-helpers';

export function getActiveLeaveCinemaUserWhere(
  userId: number,
  cinemaId: number,
) {
  return {
    id: userId,
    isActive: true,
    role: {
      not: 'MASTER' as const,
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
  };
}

export async function ensureLeaveActorCinemaAccess(
  prisma: PrismaService,
  user: AuthUser,
  cinemaId: number,
) {
  if (user.role === 'MASTER') {
    return;
  }

  const actorUserId = requireUserId(user);
  const actor = await prisma.user.findFirst({
    where: getActiveLeaveCinemaUserWhere(
      actorUserId,
      cinemaId,
    ),
    select: {
      id: true,
    },
  });

  if (!actor) {
    throw new ForbiddenException(
      'Du er ikke aktivt tilknyttet denne biograf',
    );
  }
}
