import {
  BadRequestException,
  ForbiddenException,
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

function parseOptionalReceiverId(
  value: number | null | undefined,
) {
  if (value === undefined || value === null) {
    return null;
  }

  const parsedId = Number(value);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw new BadRequestException(
      'Modtager skal være et gyldigt ID',
    );
  }

  return parsedId;
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
  const isBroadcast = data.isBroadcast === true;

  if (
    isBroadcast &&
    data.senderRole !== 'ADMIN' &&
    data.senderRole !== 'MASTER' &&
    !data.senderCanSendBroadcastMessages
  ) {
    throw new ForbiddenException(
      'Du har ikke adgang til at sende beskeder til alle.',
    );
  }

  const receiverId = isBroadcast
    ? null
    : parseOptionalReceiverId(data.receiverId);

  if (!isBroadcast && !receiverId) {
    throw new BadRequestException(
      'Vælg en modtager eller send til alle.',
    );
  }

  if (receiverId) {
    const receiver = await prisma.user.findFirst({
      where: getActiveMessageReceiverWhere(
        receiverId,
        data.cinemaId,
      ),
      select: {
        id: true,
      },
    });

    if (!receiver) {
      throw new BadRequestException(
        'Modtager findes ikke i den valgte biograf.',
      );
    }
  }

  const createdMessage = await prisma.message.create({
    data: {
      subject,
      body,
      cinemaId: data.cinemaId,
      senderId: data.senderId,
      receiverId,
      isBroadcast,
    },
    include: messageInclude,
  });

  notifyMessagesUpdated(realtime, createdMessage);
  return createdMessage;
}
