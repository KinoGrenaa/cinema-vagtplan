import {
  getStaffingRequestNotificationLink,
} from '../../notifications/helpers/notification-deep-links';

import {
  PrismaService,
} from '../../prisma/prisma.service';

type StaffingNotificationPrisma =
  Pick<
    PrismaService,
    'notification'
  >;

export function getStaffingRequestNotificationLinks(
  requestIds: number[],
) {
  return Array.from(
    new Set(
      requestIds.filter(
        (requestId) =>
          Number.isInteger(
            requestId,
          ) &&
          requestId > 0,
      ),
    ),
  ).map((requestId) =>
    getStaffingRequestNotificationLink(
      requestId,
    ),
  );
}

export async function resolveStaffingRequestNotifications(
  prisma: StaffingNotificationPrisma,
  cinemaId: number,
  requestIds: number[],
) {
  const links =
    getStaffingRequestNotificationLinks(
      requestIds,
    );

  if (links.length === 0) {
    return [];
  }

  const where = {
    cinemaId,
    type: 'STAFFING_REQUEST',
    linkUrl: {
      in: links,
    },
  };

  const notifications =
    await prisma.notification.findMany({
      where,
      select: {
        userId: true,
      },
    });

  if (notifications.length === 0) {
    return [];
  }

  await prisma.notification.updateMany({
    where,
    data: {
      isRead: true,
      linkUrl: null,
    },
  });

  return Array.from(
    new Set(
      notifications.map(
        (notification) =>
          notification.userId,
      ),
    ),
  );
}
