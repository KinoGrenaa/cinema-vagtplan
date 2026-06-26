import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export async function findAllCinemas(prisma: PrismaService) {
  return prisma.cinema.findMany({
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
