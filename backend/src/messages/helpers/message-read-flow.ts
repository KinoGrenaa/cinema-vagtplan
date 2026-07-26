import {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  buildArchivedMessagePage,
  buildArchivedMessageWhere,
  buildInboxMessageTargetWhere,
  buildInboxMessageWhere,
  buildMessagePage,
  type ArchivedMessagePageOptions,
  type InboxMessagePageOptions,
  normalizeMessagePageLimit,
} from './message-page';
import {
  messageInclude,
} from './message-shared';

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
      OR: [
        {
          receiverId: userId,
        },
        {
          isBroadcast: true,
        },
      ],
    },
    include: messageInclude,
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function findInboxMessagePageForUser(
  prisma: PrismaService,
  userId: number,
  cinemaId: number,
  options:
    InboxMessagePageOptions = {},
) {
  const limit =
    normalizeMessagePageLimit(
      options.limit,
    );

  const [
    rows,
    target,
  ] = await Promise.all([
    prisma.message.findMany({
      where:
        buildInboxMessageWhere(
          userId,
          cinemaId,
          options.beforeId,
        ),
      include: messageInclude,
      orderBy: {
        id: 'desc',
      },
      take: limit + 1,
    }),
    options.targetId
      ? prisma.message.findFirst({
          where:
            buildInboxMessageTargetWhere(
              userId,
              cinemaId,
              options.targetId,
            ),
          include:
            messageInclude,
        })
      : Promise.resolve(null),
  ]);

  return buildMessagePage(
    rows,
    limit,
    target,
  );
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
      OR: [
        {
          receiverId: userId,
        },
        {
          isBroadcast: true,
        },
        {
          senderId: userId,
        },
      ],
    },
    include: messageInclude,
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function findArchivedMessagePageForUser(
  prisma: PrismaService,
  userId: number,
  cinemaId: number,
  options:
    ArchivedMessagePageOptions,
) {
  const limit =
    normalizeMessagePageLimit(
      options.limit,
    );
  const receivedWhere =
    buildArchivedMessageWhere(
      userId,
      cinemaId,
      'received',
    );
  const sentWhere =
    buildArchivedMessageWhere(
      userId,
      cinemaId,
      'sent',
    );

  const [
    rows,
    receivedCount,
    sentCount,
  ] = await Promise.all([
    prisma.message.findMany({
      where:
        buildArchivedMessageWhere(
          userId,
          cinemaId,
          options.section,
          options.beforeId,
        ),
      include: messageInclude,
      orderBy: {
        id: 'desc',
      },
      take: limit + 1,
    }),
    prisma.message.count({
      where: receivedWhere,
    }),
    prisma.message.count({
      where: sentWhere,
    }),
  ]);

  return buildArchivedMessagePage(
    rows,
    limit,
    {
      received:
        receivedCount,
      sent: sentCount,
    },
  );
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
      ...(cinemaId
        ? {
            cinemaId,
          }
        : {}),
      OR: [
        {
          receiverId: userId,
        },
        {
          isBroadcast: true,
        },
      ],
    },
  });
}
