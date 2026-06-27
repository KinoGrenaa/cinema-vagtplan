import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { CreateMessageDto } from '../dto/create-message.dto';
import { messageInclude, notifyMessagesUpdated } from './message-shared';

export type CreateMessageInput = CreateMessageDto & {
  cinemaId: number;
  senderId: number;
};

function parseOptionalReceiverId(value: number | null | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  const parsedId = Number(value);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw new BadRequestException('Modtager skal være et gyldigt ID');
  }

  return parsedId;
}

export async function createMessage(
  prisma: PrismaService,
  realtime: RealtimeGateway,
  data: CreateMessageInput,
) {
  const sender = await prisma.user.findFirst({
    where: {
      id: data.senderId,
      cinemaId: data.cinemaId,
      isActive: true,
    },
    select: {
      id: true,
      role: true,
      canSendBroadcastMessages: true,
    },
  });

  if (!sender) {
    throw new ForbiddenException('Du har ikke adgang til at sende beskeder.');
  }

  const isBroadcast = data.isBroadcast === true;

  if (
    isBroadcast &&
    sender.role !== 'ADMIN' &&
    sender.role !== 'MASTER' &&
    !sender.canSendBroadcastMessages
  ) {
    throw new ForbiddenException(
      'Du har ikke adgang til at sende beskeder til alle.',
    );
  }

  const receiverId = isBroadcast
    ? null
    : parseOptionalReceiverId(data.receiverId);

  if (!isBroadcast && !receiverId) {
    throw new BadRequestException('Vælg en modtager eller send til alle.');
  }

  if (receiverId) {
    const receiver = await prisma.user.findFirst({
      where: {
        id: receiverId,
        cinemaId: data.cinemaId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!receiver) {
      throw new BadRequestException(
        'Modtager findes ikke i den valgte biograf.',
      );
    }
  }

  const createdMessage = await prisma.message.create({
    data: {
      subject: data.subject,
      body: data.body,
      cinemaId: data.cinemaId,
      senderId: sender.id,
      receiverId,
      isBroadcast,
    },
    include: messageInclude,
  });

  notifyMessagesUpdated(realtime, createdMessage);

  return createdMessage;
}
