import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  getActiveMessageReceiverWhere,
} from './message-cinema-access';
import {
  messageParticipantSelect,
  presentMessageForUser,
} from './message-shared';

type ConversationRole = string | null | undefined;

function canSendBroadcast(
  role: ConversationRole,
  canSendBroadcastMessages: boolean | null | undefined,
) {
  return (
    role === 'ADMIN' ||
    role === 'MASTER' ||
    canSendBroadcastMessages === true
  );
}

async function findActiveParticipants(
  prisma: PrismaService,
  ids: number[],
  cinemaId: number,
) {
  const uniqueIds = Array.from(new Set(ids));

  const rows = await Promise.all(
    uniqueIds.map((id) =>
      prisma.user.findFirst({
        where: getActiveMessageReceiverWhere(
          id,
          cinemaId,
        ),
        select: messageParticipantSelect,
      }),
    ),
  );

  return rows.filter(
    (
      row,
    ): row is {
      id: number;
      firstName: string;
      lastName: string;
    } => Boolean(row),
  );
}

export async function findMessageConversationForUser(
  prisma: PrismaService,
  userId: number,
  cinemaId: number,
  messageId: number,
  role?: ConversationRole,
  canSendBroadcastMessages?: boolean | null,
) {
  const anchor = await prisma.message.findUnique({
    where: {
      id: messageId,
    },
    select: {
      id: true,
      cinemaId: true,
      senderId: true,
      senderDeletedAt: true,
      isBroadcast: true,
      conversationId: true,
      recipients: {
        select: {
          userId: true,
          deletedAt: true,
          receiptExcludedAt: true,
        },
      },
    },
  });

  if (!anchor) {
    throw new NotFoundException('Besked ikke fundet');
  }

  if (anchor.cinemaId !== cinemaId) {
    throw new ForbiddenException(
      'Du har ikke adgang til denne besked',
    );
  }

  const ownAnchorRecipient = anchor.recipients.find(
    (recipient) => recipient.userId === userId,
  );

  const anchorVisible =
    anchor.senderId === userId
      ? !anchor.senderDeletedAt
      : Boolean(
          ownAnchorRecipient && !ownAnchorRecipient.deletedAt,
        );

  if (!anchorVisible) {
    throw new ForbiddenException(
      'Du har ikke adgang til denne besked',
    );
  }

  const rows = await prisma.message.findMany({
    where: {
      cinemaId,
      conversationId: anchor.conversationId,
    },
    include: {
      sender: {
        select: messageParticipantSelect,
      },
      receiver: {
        select: messageParticipantSelect,
      },
      recipients: {
        select: {
          userId: true,
          readAt: true,
          deletedAt: true,
          receiptExcludedAt: true,
          user: {
            select: messageParticipantSelect,
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

  const messages = rows
    .filter((row) => {
      if (row.senderId === userId) {
        return !row.senderDeletedAt;
      }

      const ownRecipient = row.recipients.find(
        (recipient) => recipient.userId === userId,
      );

      return Boolean(ownRecipient && !ownRecipient.deletedAt);
    })
    .map((row) => {
      const ownRecipient = row.recipients.filter(
        (recipient) => recipient.userId === userId,
      );

      const presented = presentMessageForUser(
        {
          ...row,
          recipients: ownRecipient,
        },
        userId,
      );

      return {
        ...presented,
        recipientParticipants: row.recipients.map(
          (recipient) => recipient.user,
        ),
      };
    });

  const replyRecipients =
    anchor.senderId === userId
      ? []
      : await findActiveParticipants(
          prisma,
          [anchor.senderId],
          cinemaId,
        );

  const replyAllCandidateIds = [
    anchor.senderId,
    ...anchor.recipients
      .filter(
        (recipient) => !recipient.receiptExcludedAt,
      )
      .map((recipient) => recipient.userId),
  ].filter((id) => id !== userId);

  const replyAllRecipients = await findActiveParticipants(
    prisma,
    replyAllCandidateIds,
    cinemaId,
  );

  const broadcastReplyAllAllowed =
    !anchor.isBroadcast ||
    canSendBroadcast(role, canSendBroadcastMessages);

  return {
    messageId: anchor.id,
    conversationId: anchor.conversationId,
    messages,
    reply: {
      canReply: replyRecipients.length > 0,
      canReplyAll:
        broadcastReplyAllAllowed &&
        replyAllRecipients.length > replyRecipients.length,
      replyRecipients,
      replyAllRecipients: broadcastReplyAllAllowed
        ? replyAllRecipients
        : [],
    },
  };
}
