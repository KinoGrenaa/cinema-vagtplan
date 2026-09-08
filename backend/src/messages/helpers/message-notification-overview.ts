import {
  Prisma,
} from '@prisma/client';

import {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  messageMailboxInclude,
  presentMessageForUser,
} from './message-shared';

export const MESSAGE_NOTIFICATION_OVERVIEW_LIMIT =
  50;

export function buildUnreadMessageNotificationWhere(
  userId: number,
  cinemaId: number,
): Prisma.MessageWhereInput {
  return {
    cinemaId,
    recalledAt: null,
    recipients: {
      some: {
        userId,
        readAt: null,
        deletedAt: null,
      },
    },
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
      include:
        messageMailboxInclude(
          userId,
        ),
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
    items: items.map((message) =>
      presentMessageForUser(
        message,
        userId,
      ),
    ),
    total,
    hasMore:
      total > items.length,
  };
}
