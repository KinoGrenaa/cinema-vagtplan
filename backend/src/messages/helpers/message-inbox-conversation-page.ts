import {
  Prisma,
} from '@prisma/client';

import {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  normalizeMessagePageLimit,
  type InboxMessagePageOptions,
} from './message-page';
import {
  messageMailboxInclude,
  presentMessageForUser,
} from './message-shared';

type InboxConversationStateRow = {
  conversationId: string;
  representativeId: number;
  unreadCount: number;
  lastActivityId: number;
  lastActivityAt: Date;
  messageCount: number;
};

function conversationStateCtes(
  userId: number,
  cinemaId: number,
) {
  return Prisma.sql`
    active_received AS (
      SELECT
        messages."conversationId" AS "conversationId",
        MAX(messages.id)::integer AS "representativeId",
        COUNT(*) FILTER (
          WHERE recipients."readAt" IS NULL
        )::integer AS "unreadCount"
      FROM "MessageRecipient" recipients
      INNER JOIN "Message" messages
        ON messages.id = recipients."messageId"
      WHERE recipients."userId" = ${userId}
        AND recipients."deletedAt" IS NULL
        AND messages."cinemaId" = ${cinemaId}
        AND messages."recalledAt" IS NULL
      GROUP BY messages."conversationId"
    ),
    visible_activity AS (
      SELECT
        active_received."conversationId" AS "conversationId",
        MAX(messages.id)::integer AS "lastActivityId",
        MAX(messages."createdAt") AS "lastActivityAt",
        COUNT(*)::integer AS "messageCount"
      FROM active_received
      INNER JOIN "Message" messages
        ON messages."conversationId" = active_received."conversationId"
        AND messages."cinemaId" = ${cinemaId}
        AND messages."recalledAt" IS NULL
      LEFT JOIN "MessageRecipient" own_recipient
        ON own_recipient."messageId" = messages.id
        AND own_recipient."userId" = ${userId}
      WHERE (
        messages."senderId" = ${userId}
        AND messages."senderDeletedAt" IS NULL
      )
      OR (
        own_recipient."userId" = ${userId}
        AND own_recipient."deletedAt" IS NULL
      )
      GROUP BY active_received."conversationId"
    )
  `;
}

async function findPageStates(
  prisma: PrismaService,
  userId: number,
  cinemaId: number,
  limit: number,
  beforeId?: number,
) {
  const beforeSql =
    beforeId
      ? Prisma.sql`
          WHERE visible_activity."lastActivityId" < ${beforeId}
        `
      : Prisma.empty;

  return prisma.$queryRaw<
    InboxConversationStateRow[]
  >(Prisma.sql`
    WITH ${conversationStateCtes(
      userId,
      cinemaId,
    )}
    SELECT
      active_received."conversationId",
      active_received."representativeId",
      active_received."unreadCount",
      visible_activity."lastActivityId",
      visible_activity."lastActivityAt",
      visible_activity."messageCount"
    FROM active_received
    INNER JOIN visible_activity
      ON visible_activity."conversationId" =
        active_received."conversationId"
    ${beforeSql}
    ORDER BY visible_activity."lastActivityId" DESC
    LIMIT ${limit + 1}
  `);
}

async function findTargetState(
  prisma: PrismaService,
  userId: number,
  cinemaId: number,
  targetId: number,
) {
  const rows =
    await prisma.$queryRaw<
      InboxConversationStateRow[]
    >(Prisma.sql`
      WITH
        target_conversation AS (
          SELECT
            target_messages."conversationId" AS "conversationId"
          FROM "Message" target_messages
          INNER JOIN "MessageRecipient" target_recipient
            ON target_recipient."messageId" = target_messages.id
          WHERE target_messages.id = ${targetId}
            AND target_messages."cinemaId" = ${cinemaId}
            AND target_messages."recalledAt" IS NULL
            AND target_recipient."userId" = ${userId}
            AND target_recipient."deletedAt" IS NULL
          LIMIT 1
        ),
        ${conversationStateCtes(
          userId,
          cinemaId,
        )}
      SELECT
        active_received."conversationId",
        active_received."representativeId",
        active_received."unreadCount",
        visible_activity."lastActivityId",
        visible_activity."lastActivityAt",
        visible_activity."messageCount"
      FROM active_received
      INNER JOIN visible_activity
        ON visible_activity."conversationId" =
          active_received."conversationId"
      INNER JOIN target_conversation
        ON target_conversation."conversationId" =
          active_received."conversationId"
      LIMIT 1
    `);

  return rows[0] ?? null;
}

function toDate(
  value: Date | string,
) {
  return value instanceof Date
    ? value
    : new Date(value);
}

async function presentConversationStates(
  prisma: PrismaService,
  userId: number,
  states: InboxConversationStateRow[],
) {
  if (states.length === 0) {
    return [];
  }

  const ids = Array.from(
    new Set(
      states.flatMap(
        (state) => [
          state.representativeId,
          state.lastActivityId,
        ],
      ),
    ),
  );

  const rows =
    await prisma.message.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      include:
        messageMailboxInclude(
          userId,
        ),
    });

  const byId =
    new Map(
      rows.map(
        (row) => [
          row.id,
          row,
        ],
      ),
    );

  return states.flatMap(
    (state) => {
      const row =
        byId.get(
          state.representativeId,
        );

      if (!row) {
        return [];
      }

      const lastActivityRow =
        byId.get(
          state.lastActivityId,
        ) ?? row;

      const presented =
        presentMessageForUser(
          row,
          userId,
        );
      const lastActivity =
        presentMessageForUser(
          lastActivityRow,
          userId,
        );

      return [
        {
          ...presented,
          subject:
            lastActivity.subject,
          body:
            lastActivity.body,
          sender:
            lastActivity.sender,
          isRead:
            state.unreadCount === 0,
          readAt:
            state.unreadCount === 0
              ? presented.readAt
              : null,
          conversationLastActivityId:
            state.lastActivityId,
          conversationLastActivityAt:
            toDate(
              state.lastActivityAt,
            ),
          conversationMessageCount:
            state.messageCount,
          conversationUnreadCount:
            state.unreadCount,
        },
      ];
    },
  );
}

export async function findInboxConversationPageForUser(
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

  const pageStates =
    await findPageStates(
      prisma,
      userId,
      cinemaId,
      limit,
      options.beforeId,
    );

  const hasMore =
    pageStates.length > limit;
  const selectedStates =
    pageStates.slice(
      0,
      limit,
    );

  const targetState =
    options.targetId
      ? await findTargetState(
          prisma,
          userId,
          cinemaId,
          options.targetId,
        )
      : null;

  const allStates = [
    ...selectedStates,
    ...(targetState
      ? [targetState]
      : []),
  ];

  const presented =
    await presentConversationStates(
      prisma,
      userId,
      allStates,
    );

  const presentedByConversation =
    new Map(
      presented.map(
        (message) => [
          message.conversationId,
          message,
        ],
      ),
    );

  const items =
    selectedStates.flatMap(
      (state) => {
        const message =
          presentedByConversation.get(
            state.conversationId,
          );

        return message
          ? [message]
          : [];
      },
    );

  const target =
    targetState
      ? presentedByConversation.get(
          targetState.conversationId,
        ) ?? null
      : null;

  return {
    items,
    target,
    hasMore,
    nextBeforeId:
      hasMore &&
      selectedStates.length > 0
        ? selectedStates[
            selectedStates.length - 1
          ].lastActivityId
        : null,
  };
}
