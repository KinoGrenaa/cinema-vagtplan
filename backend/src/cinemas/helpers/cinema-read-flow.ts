import {
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export async function findAllCinemas(
  prisma: PrismaService,
) {
  const [
    cinemas,
    memberships,
  ] = await Promise.all([
    prisma.cinema.findMany({
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            shifts: true,
            workTypes: true,
          },
        },
      },
    }),
    prisma.userCinemaMembership.findMany({
      where: {
        user: {
          role: {
            not: 'MASTER',
          },
        },
      },
      select: {
        cinemaId: true,
        isActive: true,
        user: {
          select: {
            isActive: true,
          },
        },
      },
    }),
  ]);

  const membershipCounts =
    new Map<
      number,
      {
        total: number;
        active: number;
      }
    >();

  for (const membership of memberships) {
    const counts =
      membershipCounts.get(
        membership.cinemaId,
      ) ?? {
        total: 0,
        active: 0,
      };

    counts.total += 1;

    if (
      membership.isActive &&
      membership.user.isActive
    ) {
      counts.active += 1;
    }

    membershipCounts.set(
      membership.cinemaId,
      counts,
    );
  }

  return cinemas.map((cinema) => {
    const counts =
      membershipCounts.get(cinema.id) ?? {
        total: 0,
        active: 0,
      };

    return {
      ...cinema,
      _count: {
        ...cinema._count,
        users: counts.total,
      },
      activeUserCount: counts.active,
      inactiveUserCount:
        counts.total - counts.active,
    };
  });
}

export async function findCinemaByIdOrThrow(
  prisma: PrismaService,
  id: number,
) {
  const cinema =
    await prisma.cinema.findUnique({
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
