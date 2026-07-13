import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export async function findAllCinemas(prisma: PrismaService) {
  const [cinemas, activeUserCounts] = await Promise.all([
    prisma.cinema.findMany({
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            users: true,
            shifts: true,
            workTypes: true,
          },
        },
      },
    }),
    prisma.user.groupBy({
      by: ['cinemaId'],
      where: {
        cinemaId: {
          not: null,
        },
        isActive: true,
      },
      _count: {
        id: true,
      },
    }),
  ]);

  const activeUserCountByCinemaId = new Map(
    activeUserCounts.flatMap((item) =>
      item.cinemaId
        ? [[item.cinemaId, item._count.id] as const]
        : [],
    ),
  );

  return cinemas.map((cinema) => {
    const activeUserCount =
      activeUserCountByCinemaId.get(cinema.id) ?? 0;

    return {
      ...cinema,
      activeUserCount,
      inactiveUserCount: Math.max(
        0,
        cinema._count.users - activeUserCount,
      ),
    };
  });
}

export async function findCinemaByIdOrThrow(
  prisma: PrismaService,
  id: number,
) {
  const cinema = await prisma.cinema.findUnique({
    where: { id },
  });

  if (!cinema) {
    throw new NotFoundException('Biograf blev ikke fundet');
  }

  return cinema;
}
