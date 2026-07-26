import type { Prisma } from '@prisma/client';
import {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  buildArchivedMessageCounts,
  buildArchivedMessageCountWhere,
  buildArchivedMessagePage,
  buildArchivedMessageWhere,
  buildInboxMessageTargetWhere,
  buildInboxMessageWhere,
  buildMessagePage,
  buildSentMessageWhere,
  DEFAULT_MESSAGE_PAGE_SIZE,
  type ArchivedMessagePageOptions,
  type InboxMessagePageOptions,
  type SentMessagePageOptions,
  normalizeMessagePageLimit,
} from './message-page';
import {
  messageInclude,
} from './message-shared';

const compatibilityMessageOrderBy: Prisma.MessageOrderByWithRelationInput[] =
  [
    {
      createdAt: 'desc',
    },
    {
      id: 'desc',
    },
  ];

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
    orderBy: compatibilityMessageOrderBy,
    take: DEFAULT_MESSAGE_PAGE_SIZE,
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
    orderBy: compatibilityMessageOrderBy,
    take: DEFAULT_MESSAGE_PAGE_SIZE,
  });
}

export async function findSentMessagePageForUser(
  prisma: PrismaService,
  userId: number,
  cinemaId: number,
  options:
    SentMessagePageOptions = {},
) {
  const limit =
    normalizeMessagePageLimit(
      options.limit,
    );
  const rows =
    await prisma.message.findMany({
      where:
        buildSentMessageWhere(
          userId,
          cinemaId,
          options.beforeId,
        ),
      include: messageInclude,
      orderBy: {
        id: 'desc',
      },
      take: limit + 1,
    });

  return buildMessagePage(
    rows,
    limit,
    null,
  );
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
    orderBy: compatibilityMessageOrderBy,
    take: DEFAULT_MESSAGE_PAGE_SIZE,
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
  const [
    rows,
    countGroups,
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
    prisma.message.groupBy({
      by: [
        'senderId',
      ],
      where:
        buildArchivedMessageCountWhere(
          userId,
          cinemaId,
        ),
      _count: {
        _all: true,
      },
    }),
  ]);

  return buildArchivedMessagePage(
    rows,
    limit,
    buildArchivedMessageCounts(
      countGroups,
      userId,
    ),
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
