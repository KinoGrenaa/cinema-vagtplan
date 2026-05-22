import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  async create(data: CreateMessageDto) {
    const createdMessage = await this.prisma.message.create({
      data: {
        subject: data.subject,
        body: data.body,
        cinemaId: data.cinemaId,
        senderId: data.senderId,
        receiverId: data.receiverId || null,
        isBroadcast: data.isBroadcast || false,
      },
      include: {
        sender: true,
        receiver: true,
      },
    });

    this.realtime.notifyCinema(message.cinemaId, 'messagesUpdated', message);

    return createdMessage;
  }

  async findAllForUser(userId: number, cinemaId: number) {
    return this.prisma.message.findMany({
      where: {
        cinemaId,
        archivedAt: null,
        recalledAt: null,
        OR: [{ receiverId: userId }, { isBroadcast: true }],
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

  async findSentForUser(userId: number, cinemaId: number) {
    return this.prisma.message.findMany({
      where: {
        cinemaId,
        senderId: userId,
        archivedAt: null,
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

  async findArchivedForUser(userId: number, cinemaId: number) {
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

  async markAsRead(id: number) {
    const updatedMessage = await this.prisma.message.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      include: {
        sender: true,
        receiver: true,
      },
    });

    this.realtime.notifyCinema(message.cinemaId, 'messagesUpdated', message);

    return updatedMessage;
  }

  async getUnreadCount(userId: number, cinemaId?: number) {
    return this.prisma.message.count({
      where: {
        isRead: false,
        archivedAt: null,
        recalledAt: null,

        ...(cinemaId
          ? {
              cinemaId,
            }
          : {}),

        OR: [
          {
            receiverId: userId,
          },
          {
            isBroadcast: true,
          },
        ],
      },
    });
  }

  async archiveMessage(id: number, userId: number) {
    const message = await this.prisma.message.findUnique({
      where: { id },
    });

    if (!message) {
      throw new Error('Besked ikke fundet');
    }

    const allowed =
      message.senderId === userId || message.receiverId === userId;

    if (!allowed) {
      throw new Error('Ingen adgang');
    }

    const updatedMessage = await this.prisma.message.update({
      where: { id },
      data: {
        archivedAt: new Date(),
      },
      include: {
        sender: true,
        receiver: true,
      },
    });

    this.realtime.notifyCinema(message.cinemaId, 'messagesUpdated', message);

    return updatedMessage;
  }

  async unarchiveMessage(id: number) {
    const updatedMessage = await this.prisma.message.update({
      where: { id },
      data: {
        archivedAt: null,
      },
      include: {
        sender: true,
        receiver: true,
      },
    });

    this.realtime.notifyCinema(message.cinemaId, 'messagesUpdated', message);

    return updatedMessage;
  }

  async recallMessage(id: number, userId: number) {
    const message = await this.prisma.message.findUnique({
      where: { id },
    });

    if (!message) {
      throw new Error('Besked ikke fundet');
    }

    if (message.senderId !== userId) {
      throw new Error('Kun afsender kan tilbagekalde beskeden');
    }

    const updatedMessage = await this.prisma.message.update({
      where: { id },
      data: {
        recalledAt: new Date(),
        recalledByUserId: userId,
      },
      include: {
        sender: true,
        receiver: true,
      },
    });

    this.realtime.notifyCinema(message.cinemaId, 'messagesUpdated', message);

    return updatedMessage;
  }
}
