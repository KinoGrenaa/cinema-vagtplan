import {
  Prisma,
} from '@prisma/client';

import {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  messageInclude,
} from './message-shared';

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
  return prisma.message.findMany({
    where:
      buildUnreadMessageNotificationWhere(
        userId,
        cinemaId,
      ),
    include: messageInclude,
    orderBy: {
      createdAt: 'desc',
    },
  });
}
