import type { Prisma } from '@prisma/client';

import {
  getShiftTradeNotificationLink,
} from '../../notifications/helpers/notification-deep-links';

export function getShiftTradeNotificationLinks(
  tradeIds: number[],
) {
  return [
    ...new Set(
      tradeIds
        .filter(
          (tradeId) =>
            Number.isInteger(tradeId) &&
            tradeId > 0,
        )
        .map(
          (tradeId) =>
            getShiftTradeNotificationLink(
              tradeId,
            ),
        ),
    ),
  ];
}

export async function resolveShiftTradeOfferNotifications(
  prisma: Prisma.TransactionClient,
  cinemaId: number,
  tradeIds: number[],
) {
  const linkUrls =
    getShiftTradeNotificationLinks(
      tradeIds,
    );

  if (linkUrls.length === 0) {
    return [] as number[];
  }

  const notifications =
    await prisma.notification.findMany({
      where: {
        cinemaId,
        type: 'SHIFT_DIRECT',
        linkUrl: {
          in: linkUrls,
        },
      },
      select: {
        userId: true,
      },
    });

  await prisma.notification.updateMany({
    where: {
      cinemaId,
      type: 'SHIFT_DIRECT',
      linkUrl: {
        in: linkUrls,
      },
    },
    data: {
      isRead: true,
      linkUrl: null,
    },
  });

  return [
    ...new Set(
      notifications.map(
        (notification) =>
          notification.userId,
      ),
    ),
  ];
}
