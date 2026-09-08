import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  getMessageDeletionCutoff,
  isMessageDeletionExpired,
} from './message-retention';
import {
  messageMailboxInclude,
  notifyMessagesUpdated,
  presentMessageForUser,
} from './message-shared';

function ensureMessageCinemaAccess(
  message: { cinemaId: number },
  cinemaId: number,
) {
  if (message.cinemaId !== cinemaId) {
    throw new ForbiddenException('Du har ikke adgang til denne besked');
  }
}

async function getMailboxState(
  prisma: PrismaService,
  messageId: number,
  userId: number,
) {
  return prisma.messageRecipient.findUnique({
    where: {
      messageId_userId: {
        messageId,
        userId,
      },
    },
  });
}

async function loadPresentedMessage(
  prisma: PrismaService,
  id: number,
  userId: number,
) {
  const message =
    await prisma.message.findUnique({
      where: {
        id,
      },
      include:
        messageMailboxInclude(
          userId,
        ),
    });

  if (!message) {
    throw new NotFoundException('Besked ikke fundet');
  }

  return presentMessageForUser(
    message,
    userId,
  );
}

function conversationRecipientWhere(
  userId: number,
  cinemaId: number,
  conversationId: string,
) {
  return {
    userId,
    message: {
      is: {
        cinemaId,
        conversationId,
      },
    },
  } as const;
}

export async function markMessageAsRead(
  prisma: PrismaService,
  realtime: RealtimeGateway,
  id: number,
  userId: number,
  cinemaId: number,
) {
  const message =
    await prisma.message.findUnique({
      where: {
        id,
      },
    });

  if (!message) {
    throw new NotFoundException('Besked ikke fundet');
  }

  ensureMessageCinemaAccess(
    message,
    cinemaId,
  );

  const mailbox =
    await getMailboxState(
      prisma,
      id,
      userId,
    );

  if (
    !mailbox ||
    mailbox.deletedAt
  ) {
    throw new ForbiddenException('Du har ikke adgang til denne besked');
  }

  await prisma.messageRecipient.updateMany({
    where: {
      ...conversationRecipientWhere(
        userId,
        cinemaId,
        message.conversationId,
      ),
      deletedAt: null,
      readAt: null,
      message: {
        is: {
          cinemaId,
          conversationId:
            message.conversationId,
          recalledAt: null,
        },
      },
    },
    data: {
      readAt:
        new Date(),
    },
  });

  const updatedMessage =
    await loadPresentedMessage(
      prisma,
      id,
      userId,
    );

  notifyMessagesUpdated(
    realtime,
    updatedMessage,
  );
  return updatedMessage;
}

export async function archiveMessageForUser(
  prisma: PrismaService,
  realtime: RealtimeGateway,
  id: number,
  userId: number,
  cinemaId: number,
) {
  const message =
    await prisma.message.findUnique({
      where: {
        id,
      },
    });

  if (!message) {
    throw new NotFoundException('Besked ikke fundet');
  }

  ensureMessageCinemaAccess(
    message,
    cinemaId,
  );

  const isSender =
    message.senderId === userId;
  const mailbox =
    isSender
      ? null
      : await getMailboxState(
          prisma,
          id,
          userId,
        );

  if (
    !isSender &&
    !mailbox
  ) {
    throw new ForbiddenException('Du har ikke adgang til denne besked');
  }

  if (isSender) {
    if (!message.senderDeletedAt) {
      await prisma.message.update({
        where: {
          id,
        },
        data: {
          senderDeletedAt:
            new Date(),
        },
      });
    }
  } else if (!mailbox?.deletedAt) {
    await prisma.messageRecipient.updateMany({
      where: {
        ...conversationRecipientWhere(
          userId,
          cinemaId,
          message.conversationId,
        ),
        deletedAt: null,
      },
      data: {
        deletedAt:
          new Date(),
      },
    });
  }

  const updatedMessage =
    await loadPresentedMessage(
      prisma,
      id,
      userId,
    );

  notifyMessagesUpdated(
    realtime,
    updatedMessage,
  );
  return updatedMessage;
}

export async function unarchiveMessageForUser(
  prisma: PrismaService,
  realtime: RealtimeGateway,
  id: number,
  userId: number,
  cinemaId: number,
) {
  const message =
    await prisma.message.findUnique({
      where: {
        id,
      },
    });

  if (!message) {
    throw new NotFoundException('Besked ikke fundet');
  }

  ensureMessageCinemaAccess(
    message,
    cinemaId,
  );

  const isSender =
    message.senderId === userId;
  const mailbox =
    isSender
      ? null
      : await getMailboxState(
          prisma,
          id,
          userId,
        );

  if (
    !isSender &&
    !mailbox
  ) {
    throw new ForbiddenException('Du har ikke adgang til denne besked');
  }

  const deletedAt =
    isSender
      ? message.senderDeletedAt
      : mailbox?.deletedAt;

  if (!deletedAt) {
    return loadPresentedMessage(
      prisma,
      id,
      userId,
    );
  }

  if (
    isMessageDeletionExpired(
      deletedAt,
    )
  ) {
    throw new NotFoundException(
      'Beskeden er slettet permanent og kan ikke gendannes',
    );
  }

  if (isSender) {
    await prisma.message.update({
      where: {
        id,
      },
      data: {
        senderDeletedAt: null,
      },
    });
  } else {
    await prisma.messageRecipient.updateMany({
      where: {
        ...conversationRecipientWhere(
          userId,
          cinemaId,
          message.conversationId,
        ),
        deletedAt: {
          gt:
            getMessageDeletionCutoff(),
        },
      },
      data: {
        deletedAt: null,
      },
    });
  }

  const updatedMessage =
    await loadPresentedMessage(
      prisma,
      id,
      userId,
    );

  notifyMessagesUpdated(
    realtime,
    updatedMessage,
  );
  return updatedMessage;
}

export async function recallMessageForUser(
  prisma: PrismaService,
  realtime: RealtimeGateway,
  id: number,
  userId: number,
  cinemaId: number,
) {
  const message = await prisma.message.findUnique({
    where: {
      id,
    },
  });

  if (!message) {
    throw new NotFoundException('Besked ikke fundet');
  }

  ensureMessageCinemaAccess(message, cinemaId);

  if (message.senderId !== userId) {
    throw new ForbiddenException('Kun afsender kan tilbagekalde beskeden');
  }

  const updatedMessage = await prisma.message.update({
    where: {
      id,
    },
    data: {
      recalledAt: new Date(),
      recalledByUserId: userId,
    },
    include: messageMailboxInclude(userId),
  });

  const presented =
    presentMessageForUser(
      updatedMessage,
      userId,
    );

  notifyMessagesUpdated(realtime, presented);
  return presented;
}
