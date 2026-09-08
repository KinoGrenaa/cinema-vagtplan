import {
  Prisma,
} from '@prisma/client';

import {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  buildArchivedMessageWhere,
  normalizeMessagePageLimit,
  type ArchivedMessagePageOptions,
} from './message-page';
import {
  getMessageDeletionCutoff,
} from './message-retention';
import {
  messageParticipantSelect,
  presentMessageForUser,
} from './message-shared';

type ArchivedConversationStateRow = {
  conversationId: string;
  representativeId: number;
  archivedAt: Date;
};

type CountRow = {
  count: number;
};

function archivedReceivedConversationCte(
  userId: number,
  cinemaId: number,
  cutoff: Date,
) {
  return Prisma.sql`
    archived_received AS (
      SELECT
        messages."conversationId" AS "conversationId",
        MAX(
          CASE
            WHEN recipients."deletedAt" > ${cutoff}
              THEN messages.id
            ELSE NULL
          END
        )::integer AS "representativeId",
        MAX(
          CASE
            WHEN recipients."deletedAt" > ${cutoff}
              THEN recipients."deletedAt"
            ELSE NULL
          END
        ) AS "archivedAt",
        COUNT(*) FILTER (
          WHERE recipients."deletedAt" IS NULL
        )::integer AS "activeCount",
        COUNT(*) FILTER (
          WHERE recipients."deletedAt" > ${cutoff}
        )::integer AS "archivedCount"
      FROM "MessageRecipient" recipients
      INNER JOIN "Message" messages
        ON messages.id = recipients."messageId"
      WHERE recipients."userId" = ${userId}
        AND messages."cinemaId" = ${cinemaId}
        AND messages."recalledAt" IS NULL
      GROUP BY messages."conversationId"
    )
  `;
}

async function findArchivedConversationStates(
  prisma: PrismaService,
  userId: number,
  cinemaId: number,
  limit: number,
  cutoff: Date,
  beforeId?: number,
) {
  const beforeSql =
    beforeId
      ? Prisma.sql`
          AND "representativeId" < ${beforeId}
        `
      : Prisma.empty;

  return prisma.$queryRaw<
    ArchivedConversationStateRow[]
  >(Prisma.sql`
    WITH ${archivedReceivedConversationCte(
      userId,
      cinemaId,
      cutoff,
    )}
    SELECT
      "conversationId",
      "representativeId",
      "archivedAt"
    FROM archived_received
    WHERE "activeCount" = 0
      AND "archivedCount" > 0
      ${beforeSql}
    ORDER BY "representativeId" DESC
    LIMIT ${limit + 1}
  `);
}

export async function countArchivedReceivedConversations(
  prisma: PrismaService,
  userId: number,
  cinemaId: number,
  now: Date = new Date(),
) {
  const cutoff =
    getMessageDeletionCutoff(
      now,
    );

  const rows =
    await prisma.$queryRaw<
      CountRow[]
    >(Prisma.sql`
      WITH ${archivedReceivedConversationCte(
        userId,
        cinemaId,
        cutoff,
      )}
      SELECT
        COUNT(*)::integer AS "count"
      FROM archived_received
      WHERE "activeCount" = 0
        AND "archivedCount" > 0
    `);

  return rows[0]?.count ?? 0;
}

function isRecoverable(
  value: Date | null | undefined,
  cutoff: Date,
) {
  return (
    !value ||
    value.getTime() >
      cutoff.getTime()
  );
}

async function loadArchivedConversationMessages(
  prisma: PrismaService,
  userId: number,
  cinemaId: number,
  conversationIds: string[],
  cutoff: Date,
) {
  if (
    conversationIds.length ===
    0
  ) {
    return new Map<
      string,
      Array<Record<string, unknown>>
    >();
  }

  const rows =
    await prisma.message.findMany({
      where: {
        cinemaId,
        recalledAt: null,
        conversationId: {
          in:
            conversationIds,
        },
      },
      include: {
        sender: {
          select:
            messageParticipantSelect,
        },
        receiver: {
          select:
            messageParticipantSelect,
        },
        recipients: {
          select: {
            userId: true,
            readAt: true,
            deletedAt: true,
            user: {
              select:
                messageParticipantSelect,
            },
          },
        },
      },
      orderBy: [
        {
          createdAt: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });

  const byConversation =
    new Map<
      string,
      Array<Record<string, unknown>>
    >();

  for (const row of rows) {
    const ownRecipient =
      row.recipients.find(
        (recipient) =>
          recipient.userId ===
          userId,
      );

    const visible =
      row.senderId === userId
        ? isRecoverable(
            row.senderDeletedAt,
            cutoff,
          )
        : Boolean(
            ownRecipient &&
              isRecoverable(
                ownRecipient.deletedAt,
                cutoff,
              ),
          );

    if (!visible) {
      continue;
    }

    const ownRecipientStates =
      ownRecipient
        ? [
            {
              readAt:
                ownRecipient.readAt,
              deletedAt:
                ownRecipient.deletedAt,
            },
          ]
        : [];

    const recipientParticipants =
      row.recipients
        .map(
          (recipient) =>
            recipient.user,
        )
        .filter(
          (
            user,
          ): user is NonNullable<
            typeof user
          > =>
            Boolean(user),
        );

    const presented =
      presentMessageForUser(
        {
          ...row,
          recipients:
            ownRecipientStates,
        },
        userId,
      );

    const messages =
      byConversation.get(
        row.conversationId,
      ) ?? [];

    messages.push({
      ...presented,
      recipientParticipants,
    });

    byConversation.set(
      row.conversationId,
      messages,
    );
  }

  return byConversation;
}

export async function findArchivedReceivedConversationPageForUser(
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
  const now = new Date();
  const cutoff =
    getMessageDeletionCutoff(
      now,
    );

  const [
    states,
    receivedCount,
    sentCount,
  ] = await Promise.all([
    findArchivedConversationStates(
      prisma,
      userId,
      cinemaId,
      limit,
      cutoff,
      options.beforeId,
    ),
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

  const hasMore =
    states.length > limit;
  const selectedStates =
    states.slice(
      0,
      limit,
    );
  const conversationIds =
    selectedStates.map(
      (state) =>
        state.conversationId,
    );

  const messagesByConversation =
    await loadArchivedConversationMessages(
      prisma,
      userId,
      cinemaId,
      conversationIds,
      cutoff,
    );

  const items =
    selectedStates.flatMap(
      (state) => {
        const conversationMessages =
          messagesByConversation.get(
            state.conversationId,
          ) ?? [];

        const representative =
          conversationMessages.find(
            (message) =>
              message.id ===
              state.representativeId,
          );

        if (!representative) {
          return [];
        }

        const lastActivity =
          conversationMessages[
            conversationMessages.length -
              1
          ] ?? representative;

        return [
          {
            ...representative,
            subject:
              lastActivity.subject,
            body:
              lastActivity.body,
            sender:
              lastActivity.sender,
            archivedAt:
              state.archivedAt,
            conversationId:
              state.conversationId,
            conversationMessageCount:
              conversationMessages.length,
            conversationMessages,
          },
        ];
      },
    );

  return {
    items,
    hasMore,
    nextBeforeId:
      hasMore &&
      selectedStates.length > 0
        ? selectedStates[
            selectedStates.length - 1
          ].representativeId
        : null,
    counts: {
      received:
        receivedCount,
      sent:
        sentCount,
    },
  };
}
