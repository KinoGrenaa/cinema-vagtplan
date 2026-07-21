import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { messageInclude, notifyMessagesUpdated } from './message-shared';

function ensureMessageCinemaAccess(
  message: { cinemaId: number },
  cinemaId: number,
) {
  if (message.cinemaId !== cinemaId) {
    throw new ForbiddenException('Du har ikke adgang til denne besked');
  }
}

export async function markMessageAsRead(
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

  const allowed =
    message.receiverId === userId ||
    (message.isBroadcast && message.senderId !== userId);

  if (!allowed) {
    throw new ForbiddenException('Du har ikke adgang til denne besked');
  }

  const updatedMessage = await prisma.message.update({
    where: {
      id,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
    include: messageInclude,
  });

  notifyMessagesUpdated(realtime, updatedMessage);
  return updatedMessage;
}

export async function archiveMessageForUser(
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

  const allowed =
    message.senderId === userId || message.receiverId === userId;

  if (!allowed) {
    throw new ForbiddenException('Du har ikke adgang til denne besked');
  }

  const updatedMessage = await prisma.message.update({
    where: {
      id,
    },
    data: {
      archivedAt: new Date(),
    },
    include: messageInclude,
  });

  notifyMessagesUpdated(realtime, updatedMessage);
  return updatedMessage;
}

export async function unarchiveMessageForUser(
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

  const allowed =
    message.senderId === userId || message.receiverId === userId;

  if (!allowed) {
    throw new ForbiddenException('Du har ikke adgang til denne besked');
  }

  const updatedMessage = await prisma.message.update({
    where: {
      id,
    },
    data: {
      archivedAt: null,
    },
    include: messageInclude,
  });

  notifyMessagesUpdated(realtime, updatedMessage);
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
    include: messageInclude,
  });

  notifyMessagesUpdated(realtime, updatedMessage);
  return updatedMessage;
}
