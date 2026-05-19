import { Injectable } from '@nestjs/common';
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

  async create(data: {
    subject: string;
    body: string;
    cinemaId: number;
    senderId: number;
    receiverId?: number | null;
    isBroadcast: boolean;
  }) {
    const message = await this.prisma.message.create({
      data,
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
      where: { id },
      data: {
        readAt: new Date(),
      },
    });

    this.realtime.notifyAll('messagesUpdated', message);

    return message;
  }
}
