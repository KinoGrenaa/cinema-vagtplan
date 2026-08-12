import {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  getStaffingRequestNotificationLink,
} from '../../notifications/helpers/notification-deep-links';

export async function createNotificationForStaffingRequest(
  prisma: PrismaService,
  requestId: number,
) {
  const request =
    await prisma.staffingRequest.findUnique({
      where: {
        id: requestId,
      },
      include: {
        targetUser: true,
        requestedByUser: true,
      },
    });

  if (!request) {
    return;
  }

  const notification = {
    title:
      'Ny bemandingsforespørgsel',
    message:
      request.message ||
      'Der er brug for ekstra bemanding.\nKan du tage en vagt?',
    type: 'STAFFING_REQUEST',
    linkUrl:
      getStaffingRequestNotificationLink(
        request.id,
      ),
  };

  if (request.targetUserId) {
    await prisma.notification.create({
      data: {
        cinemaId:
          request.cinemaId,
        userId:
          request.targetUserId,
        ...notification,
      },
    });
    return;
  }

  const staffUsers =
    await prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          not: 'MASTER',
        },
        cinemaMemberships: {
          some: {
            cinemaId:
              request.cinemaId,
            isActive: true,
          },
        },
        userJobFunctions: {
          some: {
            cinemaId:
              request.cinemaId,
            jobFunctionId:
              request.jobFunctionId,
          },
        },
      },
      select: {
        id: true,
      },
    });

  if (
    staffUsers.length === 0
  ) {
    return;
  }

  await prisma.notification.createMany({
    data: staffUsers.map(
      (staffUser) => ({
        cinemaId:
          request.cinemaId,
        userId: staffUser.id,
        ...notification,
      }),
    ),
  });
}
