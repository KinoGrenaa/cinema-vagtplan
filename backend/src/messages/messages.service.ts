import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { PushService } from '../push/push.service';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
    private pushService: PushService,
  ) {}

  findAllForUser(userId: number, cinemaId: number) {
    return this.prisma.message.findMany({
      where: {
        cinemaId,
        archivedAt: null,
        recalledAt: null,
        OR: [
          { receiverId: userId },
          { isBroadcast: true },
          { senderId: userId },
        ],
      },
      include: {
        sender: true,
        receiver: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getUnreadCount(userId: number, cinemaId: number) {
    const count = await this.prisma.message.count({
      where: {
        cinemaId,
        archivedAt: null,
        recalledAt: null,
        readAt: null,
        OR: [
          { receiverId: userId },
          { isBroadcast: true },
        ],
      },
    });

    return { count };
  }

  async create(data: {
    subject: string;
    body: string;
    cinemaId: number;
    senderId: number;
    receiverId?: number | null;
    isBroadcast: boolean;
    systemType?: string | null;
    relatedShiftTradeId?: number | null;
  }) {
    const message = await this.prisma.message.create({
      data: {
        subject: data.subject,
        body: data.body,
        cinemaId: data.cinemaId,
        senderId: data.senderId,
        receiverId: data.receiverId ?? null,
        isBroadcast: data.isBroadcast,
        systemType: data.systemType ?? null,
        relatedShiftTradeId: data.relatedShiftTradeId ?? null,
      },
      include: {
        sender: true,
        receiver: true,
      },
    });

    this.realtime.notifyAll('messagesUpdated', message);

    if (data.isBroadcast) {
      const users = await this.prisma.user.findMany({
        where: {
          cinemaId: data.cinemaId,
          id: {
            not: data.senderId,
          },
        },
      });

      await Promise.all(
        users.map((user) =>
          this.pushService.sendToUser(user.id, {
            title: `Ny besked fra ${message.sender.firstName}`,
            body: data.subject,
            url: '/messages',
          }),
        ),
      );
    } else if (data.receiverId) {
      await this.pushService.sendToUser(data.receiverId, {
        title: `Ny besked fra ${message.sender.firstName}`,
        body: data.subject,
        url: '/messages',
      });
    }

    return message;
  }

  async markAsRead(id: number) {
    const message = await this.prisma.message.update({
      where: {
        id,
      },
      data: {
        readAt: new Date(),
      },
    });

    this.realtime.notifyAll('messagesUpdated', message);

    return message;
  }

  async archiveMessage(id: number, userId: number) {
    const message = await this.prisma.message.findUnique({
      where: {
        id,
      },
    });

    if (!message) {
      throw new NotFoundException('Beskeden blev ikke fundet');
    }

    const canArchive =
      message.receiverId === userId ||
      message.senderId === userId ||
      message.isBroadcast;

    if (!canArchive) {
      throw new ForbiddenException('Du har ikke adgang til denne besked');
    }

    const updatedMessage = await this.prisma.message.update({
      where: {
        id,
      },
      data: {
        archivedAt: new Date(),
      },
      include: {
        sender: true,
        receiver: true,
      },
    });

    this.realtime.notifyAll('messagesUpdated', updatedMessage);

    return updatedMessage;
  }

  async recallMessage(id: number, userId: number) {
    const message = await this.prisma.message.findUnique({
      where: {
        id,
      },
    });

    if (!message) {
      throw new NotFoundException('Beskeden blev ikke fundet');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('Du kan kun fortryde dine egne beskeder');
    }

    if (message.readAt) {
      throw new ForbiddenException(
        'Du kan ikke fortryde en besked, der allerede er læst',
      );
    }

    const updatedMessage = await this.prisma.message.update({
      where: {
        id,
      },
      data: {
        recalledAt: new Date(),
        recalledByUserId: userId,
      },
      include: {
        sender: true,
        receiver: true,
      },
    });

    this.realtime.notifyAll('messagesUpdated', updatedMessage);

    return updatedMessage;
  }

  async recallMessagesForShiftTrade(shiftTradeId: number, userId: number) {
    const updated = await this.prisma.message.updateMany({
      where: {
        relatedShiftTradeId: shiftTradeId,
        recalledAt: null,
      },
      data: {
        recalledAt: new Date(),
        recalledByUserId: userId,
      },
    });

    this.realtime.notifyAll('messagesUpdated', {
      relatedShiftTradeId: shiftTradeId,
      recalledByUserId: userId,
    });

    return updated;
  }

  async findArchivedForUser(
  userId: number,
  cinemaId: number,
) {
  return this.prisma.message.findMany({
    where: {
      cinemaId,
      archivedAt: {
        not: null,
      },
      recalledAt: null,
      OR: [
        { receiverId: userId },
        { isBroadcast: true },
        { senderId: userId },
      ],
    },
    include: {
      sender: true,
      receiver: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}
}