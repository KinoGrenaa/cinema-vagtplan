import { PrismaService } from '../../prisma/prisma.service';
import { messageInclude } from './message-shared';

export async function findMessagesForUser(
  prisma: PrismaService,
  userId: number,
  cinemaId: number,
) {
  return prisma.message.findMany({
    where: {
      cinemaId,
      archivedAt: null,
      recalledAt: null,
      OR: [{ receiverId: userId }, { isBroadcast: true }],
    },
    include: messageInclude,
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function findSentMessagesForUser(
  prisma: PrismaService,
  userId: number,
  cinemaId: number,
) {
  return prisma.message.findMany({
    where: {
      cinemaId,
      senderId: userId,
      archivedAt: null,
    },
    include: messageInclude,
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function findArchivedMessagesForUser(
  prisma: PrismaService,
  userId: number,
  cinemaId: number,
) {
  return prisma.message.findMany({
    where: {
      cinemaId,
      archivedAt: {
        not: null,
      },
      recalledAt: null,
      OR: [{ receiverId: userId }, { isBroadcast: true }, { senderId: userId }],
    },
    include: messageInclude,
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function getUnreadMessageCount(
  prisma: PrismaService,
  userId: number,
  cinemaId?: number,
) {
  return prisma.message.count({
    where: {
      isRead: false,
      archivedAt: null,
      recalledAt: null,
      ...(cinemaId ? { cinemaId } : {}),
      OR: [{ receiverId: userId }, { isBroadcast: true }],
    },
  });
}
