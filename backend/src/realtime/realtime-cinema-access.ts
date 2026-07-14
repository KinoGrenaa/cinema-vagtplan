import { PrismaService } from '../prisma/prisma.service';

export type RealtimeSocketUser = {
  id: number;
  role: string;
  cinemaId: number | null;
};

export async function findActiveRealtimeUser(
  prisma: PrismaService,
  userId: number,
) {
  return prisma.user.findFirst({
    where: {
      id: userId,
      isActive: true,
    },
    select: {
      id: true,
      role: true,
    },
  });
}

export async function canJoinRealtimeCinema(
  prisma: PrismaService,
  user: RealtimeSocketUser,
  cinemaId: number,
) {
  if (user.role === 'MASTER') {
    const cinema = await prisma.cinema.findUnique({
      where: {
        id: cinemaId,
      },
      select: {
        id: true,
      },
    });

    return Boolean(cinema);
  }

  if (user.cinemaId !== cinemaId) {
    return false;
  }

  const activeUser = await prisma.user.findFirst({
    where: {
      id: user.id,
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

  return Boolean(activeUser);
}
