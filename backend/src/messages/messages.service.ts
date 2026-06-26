import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import {
  createMessage,
  CreateMessageInput,
} from './helpers/message-create-flow';
import {
  findArchivedMessagesForUser,
  findMessagesForUser,
  findSentMessagesForUser,
  getUnreadMessageCount,
} from './helpers/message-read-flow';
import {
  archiveMessageForUser,
  markMessageAsRead,
  recallMessageForUser,
  unarchiveMessageForUser,
} from './helpers/message-status-flow';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  async create(data: CreateMessageInput) {
    return createMessage(this.prisma, this.realtime, data);
  }

  async findAllForUser(userId: number, cinemaId: number) {
    return findMessagesForUser(this.prisma, userId, cinemaId);
  }

  async findSentForUser(userId: number, cinemaId: number) {
    return findSentMessagesForUser(this.prisma, userId, cinemaId);
  }

  async findArchivedForUser(userId: number, cinemaId: number) {
    return findArchivedMessagesForUser(this.prisma, userId, cinemaId);
  }

  async markAsRead(id: number, userId: number, cinemaId: number) {
    return markMessageAsRead(
      this.prisma,
      this.realtime,
      id,
      userId,
      cinemaId,
    );
  }

  async getUnreadCount(userId: number, cinemaId?: number) {
    return getUnreadMessageCount(this.prisma, userId, cinemaId);
  }

  async archiveMessage(id: number, userId: number) {
    return archiveMessageForUser(this.prisma, this.realtime, id, userId);
  }

  async unarchiveMessage(id: number, userId: number, cinemaId: number) {
    return unarchiveMessageForUser(
      this.prisma,
      this.realtime,
      id,
      userId,
      cinemaId,
    );
  }

  async recallMessage(id: number, userId: number) {
    return recallMessageForUser(this.prisma, this.realtime, id, userId);
  }
}
