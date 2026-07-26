import {
  Prisma,
} from '@prisma/client';

import {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  messageInclude,
} from './message-shared';

export const MESSAGE_NOTIFICATION_OVERVIEW_LIMIT =
  50;

export function buildUnreadMessageNotificationWhere(
  userId: number,
  cinemaId: number,
): Prisma.MessageWhereInput {
  return {
    cinemaId,
    isRead: false,
    archivedAt: null,
    recalledAt: null,
    OR: [
      {
        receiverId: userId,
      },
      {
        isBroadcast: true,
      },
    ],
  };
}

export async function findUnreadMessagesForNotifications(
  prisma: PrismaService,
  userId: number,
  cinemaId: number,
) {
  const where =
    buildUnreadMessageNotificationWhere(
      userId,
      cinemaId,
    );

  const [
    items,
    total,
  ] = await Promise.all([
    prisma.message.findMany({
      where,
      include: messageInclude,
      orderBy: [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      take:
        MESSAGE_NOTIFICATION_OVERVIEW_LIMIT,
    }),
    prisma.message.count({
      where,
    }),
  ]);

  return {
    items,
    total,
    hasMore:
      total > items.length,
  };
}
