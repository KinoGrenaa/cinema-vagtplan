import {
  CinemaRole,
} from '@prisma/client';

import {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  getStaffingRequestNotificationLink,
} from '../../notifications/helpers/notification-deep-links';

type StaffingNotificationPrisma =
  Pick<
    PrismaService,
    'user' | 'notification'
  >;

export function buildAcceptedStaffingRequestAdminFilter(
  cinemaId: number,
) {
  return {
    isActive: true,
    cinemaMemberships: {
      some: {
        cinemaId,
        isActive: true,
        role: CinemaRole.ADMIN,
      },
    },
  };
}

export async function createStaffingRequestAcceptedNotifications(
  prisma:
    StaffingNotificationPrisma,
  cinemaId: number,
  requestId: number,
  acceptedByName: string,
) {
  const admins =
    await prisma.user.findMany({
      where:
        buildAcceptedStaffingRequestAdminFilter(
          cinemaId,
        ),
      select: {
        id: true,
      },
    });

  if (admins.length === 0) {
    return;
  }

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      cinemaId,
      userId: admin.id,
      title:
        'Bemandingsforespørgsel accepteret',
      message:
        `${acceptedByName} accepterede ` +
        `bemandingsforespørgsel #${requestId}`,
      type: 'STAFFING_ACCEPTED',
      linkUrl:
        getStaffingRequestNotificationLink(
          requestId,
        ),
    })),
  });
}
