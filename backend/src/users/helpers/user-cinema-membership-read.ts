import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export async function findUserCinemaMemberships(
  prisma: PrismaService,
  userId: number,
) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      cinemaId: true,
      isActive: true,
      cinemaMemberships: {
        where: {
          isActive: true,
        },
        select: {
          id: true,
          cinemaId: true,
          createdAt: true,
          cinema: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundException(
      'Bruger blev ikke fundet',
    );
  }

  if (!user.isActive) {
    return [];
  }

  return user.cinemaMemberships
    .map((membership) => ({
      id: membership.id,
      cinemaId: membership.cinemaId,
      isHomeCinema:
        membership.cinemaId === user.cinemaId,
      createdAt: membership.createdAt,
      cinema: membership.cinema,
    }))
    .sort((first, second) => {
      if (
        first.isHomeCinema !== second.isHomeCinema
      ) {
        return first.isHomeCinema ? -1 : 1;
      }

      return first.cinema.name.localeCompare(
        second.cinema.name,
        'da',
      );
    });
}
