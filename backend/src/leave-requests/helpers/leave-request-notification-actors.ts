import { PrismaService } from '../../prisma/prisma.service';
import { formatUserName } from './leave-request-formatting';

export async function getLeaveManagers(
  prisma: PrismaService,
  cinemaId: number,
  excludeUserId?: number,
) {
  return prisma.user.findMany({
    where: {
      isActive: true,
      role: {
        not: 'MASTER',
      },
      ...(excludeUserId
        ? {
            id: {
              not: excludeUserId,
            },
          }
        : {}),
      AND: [
        {
          OR: [
            {
              role: 'ADMIN',
            },
            {
              canManageLeaveRequests: true,
            },
          ],
        },
        {
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
      ],
    },
    select: {
      id: true,
    },
  });
}

export async function getActorName(
  prisma: PrismaService,
  userId: number,
) {
  const actor = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  return formatUserName(actor ?? undefined);
}
