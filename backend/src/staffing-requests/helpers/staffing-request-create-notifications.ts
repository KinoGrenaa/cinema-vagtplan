import { PrismaService } from '../../prisma/prisma.service';

export async function createNotificationForStaffingRequest(
  prisma: PrismaService,
  requestId: number,
) {
  const request = await prisma.staffingRequest.findUnique({
    where: {
      id: requestId,
    },
    include: {
      targetUser: true,
      requestedByUser: true,
    },
  });

  if (!request) return;

  const notification = {
    title: 'Ny bemandingsforespørgsel',
    message:
      request.message ||
      'Der er brug for ekstra bemanding. Kan du tage en vagt?',
    type: 'STAFFING_REQUEST',
    linkUrl: '/staffing-requests',
  };

  if (request.targetUserId) {
    await prisma.notification.create({
      data: {
        cinemaId: request.cinemaId,
        userId: request.targetUserId,
        ...notification,
      },
    });

    return;
  }

  const staffUsers = await prisma.user.findMany({
    where: {
      cinemaId: request.cinemaId,
      role: {
        in: ['ADMIN', 'EMPLOYEE'],
      },
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (staffUsers.length === 0) return;

  await prisma.notification.createMany({
    data: staffUsers.map((staffUser) => ({
      cinemaId: request.cinemaId,
      userId: staffUser.id,
      ...notification,
    })),
  });
}
