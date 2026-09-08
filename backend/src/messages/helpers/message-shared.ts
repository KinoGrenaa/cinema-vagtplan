import { RealtimeGateway } from '../../realtime/realtime.gateway';

export const messageParticipantSelect = {
  id: true,
  firstName: true,
  lastName: true,
} as const;

export const messageInclude = {
  sender: {
    select: messageParticipantSelect,
  },
  receiver: {
    select: messageParticipantSelect,
  },
} as const;

export function messageMailboxInclude(
  userId: number,
) {
  return {
    ...messageInclude,
    recipients: {
      where: {
        userId,
      },
      select: {
        readAt: true,
        deletedAt: true,
      },
      take: 1,
    },
  } as const;
}

export const messageSentReceiptInclude = {
  ...messageInclude,
  recipients: {
    where: {
      receiptExcludedAt: null,
    },
    select: {
      readAt: true,
      user: {
        select: messageParticipantSelect,
      },
    },
    orderBy: {
      userId: 'asc',
    },
  },
} as const;

export function presentMessageForUser<
  T extends {
    senderId: number;
    isRead: boolean;
    readAt: Date | null;
    archivedAt: Date | null;
    senderDeletedAt?: Date | null;
    recipients?: Array<{
      readAt: Date | null;
      deletedAt: Date | null;
    }>;
  },
>(
  message: T,
  userId: number,
) {
  const {
    recipients = [],
    senderDeletedAt,
    ...rest
  } = message;

  const recipientState =
    recipients[0] ?? null;
  const isSender =
    message.senderId === userId;

  return {
    ...rest,
    isRead: recipientState
      ? Boolean(
          recipientState.readAt,
        )
      : isSender
        ? Boolean(message.isRead)
        : false,
    readAt:
      recipientState?.readAt ??
      (isSender
        ? message.readAt
        : null),
    archivedAt: isSender
      ? senderDeletedAt ?? null
      : recipientState?.deletedAt ??
        null,
  };
}

export function presentSentMessageForUser<
  T extends {
    senderId: number;
    isRead: boolean;
    readAt: Date | null;
    archivedAt: Date | null;
    senderDeletedAt?: Date | null;
    recipients?: Array<{
      readAt: Date | null;
      user: {
        id: number;
        firstName: string;
        lastName: string;
      };
    }>;
  },
>(
  message: T,
) {
  const {
    recipients = [],
    senderDeletedAt,
    ...rest
  } = message;

  const readRecipients =
    recipients.filter(
      (recipient) =>
        Boolean(recipient.readAt),
    );
  const unreadRecipients =
    recipients.filter(
      (recipient) =>
        !recipient.readAt,
    );
  const totalRecipients =
    recipients.length;
  const readCount =
    readRecipients.length;
  const allRead =
    totalRecipients > 0 &&
    readCount ===
      totalRecipients;

  const completedReadAt =
    allRead
      ? readRecipients.reduce<Date | null>(
          (
            latest,
            recipient,
          ) => {
            if (!recipient.readAt) {
              return latest;
            }

            if (
              !latest ||
              recipient.readAt >
                latest
            ) {
              return recipient.readAt;
            }

            return latest;
          },
          null,
        )
      : null;

  return {
    ...rest,
    isRead: allRead,
    readAt:
      completedReadAt,
    archivedAt:
      senderDeletedAt ?? null,
    readReceipt: {
      totalRecipients,
      readCount,
      allRead,
      readBy:
        readRecipients.map(
          (recipient) =>
            recipient.user,
        ),
      unreadBy:
        unreadRecipients.map(
          (recipient) =>
            recipient.user,
        ),
    },
  };
}

export function notifyMessagesUpdated(
  realtime: RealtimeGateway,
  message: { cinemaId: number },
) {
  realtime.notifyCinema(
    message.cinemaId,
    'messagesUpdated',
    message,
  );
}
