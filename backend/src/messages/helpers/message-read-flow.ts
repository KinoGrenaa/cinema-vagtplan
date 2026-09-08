import type { Prisma } from '@prisma/client';
import {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  buildArchivedMessagePage,
  buildArchivedMessageWhere,
  buildMessagePage,
  buildSentMessageWhere,
  DEFAULT_MESSAGE_PAGE_SIZE,
  type ArchivedMessagePageOptions,
  type InboxMessagePageOptions,
  type SentMessagePageOptions,
  normalizeMessagePageLimit,
} from './message-page';
import {
  countArchivedReceivedConversations,
  findArchivedReceivedConversationPageForUser,
} from './message-archive-conversation-page';
import {
  findInboxConversationPageForUser,
} from './message-inbox-conversation-page';
import {
  messageMailboxInclude,
  messageSentReceiptInclude,
  presentMessageForUser,
  presentSentMessageForUser,
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

function presentMessagesForUser<
  T extends Parameters<
    typeof presentMessageForUser
  >[0],
>(
  rows: T[],
  userId: number,
) {
  return rows.map((row) =>
    presentMessageForUser(
      row,
      userId,
    ),
  );
}

export async function findMessagesForUser(
  prisma: PrismaService,
  userId: number,
  cinemaId: number,
) {
  const rows =
    await prisma.message.findMany({
      where: {
        cinemaId,
        recalledAt: null,
        recipients: {
          some: {
            userId,
            deletedAt: null,
          },
        },
      },
      include:
        messageMailboxInclude(
          userId,
        ),
      orderBy:
        compatibilityMessageOrderBy,
      take:
        DEFAULT_MESSAGE_PAGE_SIZE,
    });

  return presentMessagesForUser(
    rows,
    userId,
  );
}

export async function findInboxMessagePageForUser(
  prisma: PrismaService,
  userId: number,
  cinemaId: number,
  options:
    InboxMessagePageOptions = {},
) {
  return findInboxConversationPageForUser(
    prisma,
    userId,
    cinemaId,
    options,
  );
}

export async function findSentMessagesForUser(
  prisma: PrismaService,
  userId: number,
  cinemaId: number,
) {
  const rows =
    await prisma.message.findMany({
      where: {
        cinemaId,
        senderId: userId,
        senderDeletedAt: null,
      },
      include:
        messageSentReceiptInclude,
      orderBy:
        compatibilityMessageOrderBy,
      take:
        DEFAULT_MESSAGE_PAGE_SIZE,
    });

  return rows.map((row) =>
    presentSentMessageForUser(
      row,
    ),
  );
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
      include:
        messageSentReceiptInclude,
      orderBy: {
        id: 'desc',
      },
      take: limit + 1,
    });

  return buildMessagePage(
    rows.map((row) =>
      presentSentMessageForUser(
        row,
      ),
    ),
    limit,
    null,
  );
}

export async function findArchivedMessagesForUser(
  prisma: PrismaService,
  userId: number,
  cinemaId: number,
) {
  const now = new Date();
  const [
    received,
    sent,
  ] = await Promise.all([
    prisma.message.findMany({
      where:
        buildArchivedMessageWhere(
          userId,
          cinemaId,
          'received',
          undefined,
          now,
        ),
      include:
        messageMailboxInclude(
          userId,
        ),
      orderBy:
        compatibilityMessageOrderBy,
      take:
        DEFAULT_MESSAGE_PAGE_SIZE,
    }),
    prisma.message.findMany({
      where:
        buildArchivedMessageWhere(
          userId,
          cinemaId,
          'sent',
          undefined,
          now,
        ),
      include:
        messageMailboxInclude(
          userId,
        ),
      orderBy:
        compatibilityMessageOrderBy,
      take:
        DEFAULT_MESSAGE_PAGE_SIZE,
    }),
  ]);

  return presentMessagesForUser(
    [
      ...received,
      ...sent,
    ]
      .sort(
        (left, right) =>
          right.id - left.id,
      )
      .slice(
        0,
        DEFAULT_MESSAGE_PAGE_SIZE,
      ),
    userId,
  );
}

export async function findArchivedMessagePageForUser(
  prisma: PrismaService,
  userId: number,
  cinemaId: number,
  options:
    ArchivedMessagePageOptions,
) {
  if (
    options.section ===
    'received'
  ) {
    return findArchivedReceivedConversationPageForUser(
      prisma,
      userId,
      cinemaId,
      options,
    );
  }

  const limit =
    normalizeMessagePageLimit(
      options.limit,
    );
  const now = new Date();

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
          'sent',
          options.beforeId,
          now,
        ),
      include:
        messageMailboxInclude(
          userId,
        ),
      orderBy: {
        id: 'desc',
      },
      take: limit + 1,
    }),
    countArchivedReceivedConversations(
      prisma,
      userId,
      cinemaId,
      now,
    ),
    prisma.message.count({
      where:
        buildArchivedMessageWhere(
          userId,
          cinemaId,
          'sent',
          undefined,
          now,
        ),
    }),
  ]);

  return buildArchivedMessagePage(
    presentMessagesForUser(
      rows,
      userId,
    ),
    limit,
    {
      received:
        receivedCount,
      sent:
        sentCount,
    },
  );
}

export async function getUnreadMessageCount(
  prisma: PrismaService,
  userId: number,
  cinemaId?: number,
) {
  return prisma.messageRecipient.count({
    where: {
      userId,
      readAt: null,
      deletedAt: null,
      message: {
        recalledAt: null,
        ...(cinemaId
          ? {
              cinemaId,
            }
          : {}),
      },
    },
  });
}
