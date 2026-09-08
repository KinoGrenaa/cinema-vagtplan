import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { CreateMessageDto } from '../dto/create-message.dto';
import {
  getActiveMessageReceiverWhere,
} from './message-cinema-access';
import {
  messageInclude,
  notifyMessagesUpdated,
} from './message-shared';

export type CreateMessageInput = CreateMessageDto & {
  cinemaId: number;
  senderId: number;
  senderRole: string;
  senderCanSendBroadcastMessages?: boolean | null;
};

function parseOptionalPositiveId(
  value: number | null | undefined,
  message: string,
) {
  if (value === undefined || value === null) {
    return null;
  }

  const parsedId = Number(value);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw new BadRequestException(message);
  }

  return parsedId;
}

function normalizeRecipientIds(value: unknown) {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new BadRequestException(
      'Modtagere skal være en liste.',
    );
  }

  const result: number[] = [];
  const seen = new Set<number>();

  for (const rawId of value) {
    const parsedId = Number(rawId);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw new BadRequestException(
        'Alle modtagere skal være gyldige ID’er.',
      );
    }

    if (!seen.has(parsedId)) {
      seen.add(parsedId);
      result.push(parsedId);
    }
  }

  return result;
}

function normalizeRequiredMessageText(
  value: unknown,
  maxLength: number,
  requiredMessage: string,
  tooLongMessage: string,
) {
  if (typeof value !== 'string') {
    throw new BadRequestException(requiredMessage);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new BadRequestException(requiredMessage);
  }

  if (normalized.length > maxLength) {
    throw new BadRequestException(tooLongMessage);
  }

  return normalized;
}

function canSendBroadcast(data: CreateMessageInput) {
  return (
    data.senderRole === 'ADMIN' ||
    data.senderRole === 'MASTER' ||
    data.senderCanSendBroadcastMessages === true
  );
}

async function findActiveRecipientIds(
  prisma: PrismaService,
  recipientIds: number[],
  cinemaId: number,
) {
  const rows = await Promise.all(
    recipientIds.map((recipientId) =>
      prisma.user.findFirst({
        where: getActiveMessageReceiverWhere(
          recipientId,
          cinemaId,
        ),
        select: {
          id: true,
        },
      }),
    ),
  );

  return rows
    .filter(
      (
        row,
      ): row is {
        id: number;
      } => Boolean(row),
    )
    .map((row) => row.id);
}

async function findAllActiveRecipientIds(
  prisma: PrismaService,
  senderId: number,
  cinemaId: number,
) {
  return (
    await prisma.user.findMany({
      where: {
        id: {
          not: senderId,
        },
        cinemaMemberships: {
          some: {
            cinemaId,
            isActive: true,
          },
        },
      },
      select: {
        id: true,
      },
    })
  ).map((user) => user.id);
}

function sameRecipientSet(left: number[], right: number[]) {
  if (left.length !== right.length) {
    return false;
  }

  const rightSet = new Set(right);
  return left.every((id) => rightSet.has(id));
}

async function resolveReplyRecipientIds(
  prisma: PrismaService,
  data: CreateMessageInput,
) {
  const replyToMessageId = parseOptionalPositiveId(
    data.replyToMessageId,
    'Oprindelig besked skal være et gyldigt ID',
  );

  if (!replyToMessageId) {
    if (data.replyMode) {
      throw new BadRequestException(
        'Svar kræver en oprindelig besked.',
      );
    }

    return null;
  }

  const replyTo = await prisma.message.findUnique({
    where: {
      id: replyToMessageId,
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

  if (!replyTo) {
    throw new NotFoundException(
      'Den oprindelige besked blev ikke fundet.',
    );
  }

  if (replyTo.cinemaId !== data.cinemaId) {
    throw new ForbiddenException(
      'Du har ikke adgang til denne besked.',
    );
  }

  const ownRecipient = replyTo.recipients.find(
    (recipient) => recipient.userId === data.senderId,
  );

  const hasAccess =
    replyTo.senderId === data.senderId
      ? !replyTo.senderDeletedAt
      : Boolean(ownRecipient && !ownRecipient.deletedAt);

  if (!hasAccess) {
    throw new ForbiddenException(
      'Du har ikke adgang til denne besked.',
    );
  }

  const replyMode = data.replyMode ?? 'REPLY';

  if (
    replyMode === 'REPLY_ALL' &&
    replyTo.isBroadcast &&
    !canSendBroadcast(data)
  ) {
    throw new ForbiddenException(
      'Du har ikke adgang til at svare alle på en besked til hele biografen.',
    );
  }

  const snapshotIds =
    replyMode === 'REPLY'
      ? [replyTo.senderId]
      : [
          replyTo.senderId,
          ...replyTo.recipients
            .filter(
              (recipient) => !recipient.receiptExcludedAt,
            )
            .map((recipient) => recipient.userId),
        ];

  const candidateIds = Array.from(new Set(snapshotIds)).filter(
    (recipientId) => recipientId !== data.senderId,
  );

  const activeRecipientIds = await findActiveRecipientIds(
    prisma,
    candidateIds,
    data.cinemaId,
  );

  if (activeRecipientIds.length === 0) {
    throw new BadRequestException(
      'Der er ingen aktive modtagere at svare til.',
    );
  }

  return {
    replyToMessageId: replyTo.id,
    conversationId: replyTo.conversationId,
    recipientIds: activeRecipientIds,
  };
}

export async function createMessage(
  prisma: PrismaService,
  realtime: RealtimeGateway,
  data: CreateMessageInput,
) {
  const subject = normalizeRequiredMessageText(
    data.subject,
    200,
    'Emne skal udfyldes.',
    'Emne må højst være 200 tegn.',
  );
  const body = normalizeRequiredMessageText(
    data.body,
    5000,
    'Besked skal udfyldes.',
    'Besked må højst være 5000 tegn.',
  );

  const reply = await resolveReplyRecipientIds(
    prisma,
    data,
  );

  const requestedBroadcast = data.isBroadcast === true;

  if (requestedBroadcast && reply) {
    throw new BadRequestException(
      'Svar bruger Svar eller Svar alle – ikke Send til alle.',
    );
  }

  if (requestedBroadcast && !canSendBroadcast(data)) {
    throw new ForbiddenException(
      'Du har ikke adgang til at sende beskeder til alle.',
    );
  }

  const legacyReceiverId = parseOptionalPositiveId(
    data.receiverId,
    'Modtager skal være et gyldigt ID',
  );

  let recipientIds: number[];

  if (reply) {
    recipientIds = reply.recipientIds;
  } else if (requestedBroadcast) {
    recipientIds = await findAllActiveRecipientIds(
      prisma,
      data.senderId,
      data.cinemaId,
    );
  } else {
    const selectedRecipientIds = normalizeRecipientIds(
      data.recipientIds,
    );

    recipientIds =
      selectedRecipientIds.length > 0
        ? selectedRecipientIds
        : legacyReceiverId
          ? [legacyReceiverId]
          : [];

    if (recipientIds.length === 0) {
      throw new BadRequestException(
        'Vælg mindst én modtager eller send til alle.',
      );
    }

    if (recipientIds.includes(data.senderId)) {
      throw new BadRequestException(
        'Du kan ikke sende en besked til dig selv.',
      );
    }

    const activeRecipientIds = await findActiveRecipientIds(
      prisma,
      recipientIds,
      data.cinemaId,
    );

    if (activeRecipientIds.length !== recipientIds.length) {
      throw new BadRequestException(
        'En eller flere modtagere findes ikke længere i den valgte biograf.',
      );
    }

    recipientIds = activeRecipientIds;

    if (recipientIds.length > 1 && !canSendBroadcast(data)) {
      const allActiveRecipientIds = await findAllActiveRecipientIds(
        prisma,
        data.senderId,
        data.cinemaId,
      );

      if (sameRecipientSet(recipientIds, allActiveRecipientIds)) {
        throw new ForbiddenException(
          'Du har ikke adgang til at sende beskeder til alle.',
        );
      }
    }
  }

  if (recipientIds.length === 0) {
    throw new BadRequestException(
      'Der er ingen aktive modtagere.',
    );
  }

  const isBroadcast = requestedBroadcast && !reply;
  const receiverId =
    !isBroadcast && recipientIds.length === 1
      ? recipientIds[0]
      : null;

  const createdMessage = await prisma.message.create({
    data: {
      subject,
      body,
      cinemaId: data.cinemaId,
      senderId: data.senderId,
      receiverId,
      isBroadcast,
      ...(reply
        ? {
            conversationId: reply.conversationId,
            replyToMessageId: reply.replyToMessageId,
          }
        : {}),
      recipients: {
        create: recipientIds.map((userId) => ({
          userId,
        })),
      },
    },
    include: messageInclude,
  });

  notifyMessagesUpdated(realtime, createdMessage);
  return createdMessage;
}
