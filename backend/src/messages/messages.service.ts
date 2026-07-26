import {
  Injectable,
} from '@nestjs/common';

import {
  PrismaService,
} from '../prisma/prisma.service';
import {
  RealtimeGateway,
} from '../realtime/realtime.gateway';
import {
  CreateMessageDto,
} from './dto/create-message.dto';
import {
  createMessage,
} from './helpers/message-create-flow';
import {
  MessageActor,
  resolveMessageActorContext,
} from './helpers/message-cinema-access';
import {
  type ArchivedMessagePageOptions,
  type InboxMessagePageOptions,
  type SentMessagePageOptions,
} from './helpers/message-page';
import {
  findArchivedMessagePageForUser,
  findArchivedMessagesForUser,
  findInboxMessagePageForUser,
  findMessagesForUser,
  findSentMessagePageForUser,
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
    private realtime:
      RealtimeGateway,
  ) {}

  async create(
    actor: MessageActor,
    data: CreateMessageDto,
    selectedCinemaId?:
      number | null,
  ) {
    const context =
      await resolveMessageActorContext(
        this.prisma,
        actor,
        selectedCinemaId,
      );

    return createMessage(
      this.prisma,
      this.realtime,
      {
        ...data,
        cinemaId:
          context.cinemaId,
        senderId:
          context.userId,
        senderRole:
          context.role,
        senderCanSendBroadcastMessages:
          context.canSendBroadcastMessages,
      },
    );
  }

  async findAllForUser(
    actor: MessageActor,
    selectedCinemaId?:
      number | null,
  ) {
    const context =
      await resolveMessageActorContext(
        this.prisma,
        actor,
        selectedCinemaId,
      );

    return findMessagesForUser(
      this.prisma,
      context.userId,
      context.cinemaId,
    );
  }

  async findInboxPageForUser(
    actor: MessageActor,
    selectedCinemaId?:
      number | null,
    options:
      InboxMessagePageOptions = {},
  ) {
    const context =
      await resolveMessageActorContext(
        this.prisma,
        actor,
        selectedCinemaId,
      );

    return findInboxMessagePageForUser(
      this.prisma,
      context.userId,
      context.cinemaId,
      options,
    );
  }

  async findSentForUser(
    actor: MessageActor,
    selectedCinemaId?:
      number | null,
  ) {
    const context =
      await resolveMessageActorContext(
        this.prisma,
        actor,
        selectedCinemaId,
      );

    return findSentMessagesForUser(
      this.prisma,
      context.userId,
      context.cinemaId,
    );
  }

  async findSentPageForUser(
    actor: MessageActor,
    selectedCinemaId?:
      number | null,
    options:
      SentMessagePageOptions = {},
  ) {
    const context =
      await resolveMessageActorContext(
        this.prisma,
        actor,
        selectedCinemaId,
      );

    return findSentMessagePageForUser(
      this.prisma,
      context.userId,
      context.cinemaId,
      options,
    );
  }

  async findArchivedForUser(
    actor: MessageActor,
    selectedCinemaId?:
      number | null,
  ) {
    const context =
      await resolveMessageActorContext(
        this.prisma,
        actor,
        selectedCinemaId,
      );

    return findArchivedMessagesForUser(
      this.prisma,
      context.userId,
      context.cinemaId,
    );
  }

  async findArchivedPageForUser(
    actor: MessageActor,
    selectedCinemaId:
      number | null | undefined,
    options:
      ArchivedMessagePageOptions,
  ) {
    const context =
      await resolveMessageActorContext(
        this.prisma,
        actor,
        selectedCinemaId,
      );

    return findArchivedMessagePageForUser(
      this.prisma,
      context.userId,
      context.cinemaId,
      options,
    );
  }

  async markAsRead(
    id: number,
    actor: MessageActor,
    selectedCinemaId?:
      number | null,
  ) {
    const context =
      await resolveMessageActorContext(
        this.prisma,
        actor,
        selectedCinemaId,
      );

    return markMessageAsRead(
      this.prisma,
      this.realtime,
      id,
      context.userId,
      context.cinemaId,
    );
  }

  async getUnreadCount(
    actor: MessageActor,
    selectedCinemaId?:
      number | null,
  ) {
    const context =
      await resolveMessageActorContext(
        this.prisma,
        actor,
        selectedCinemaId,
      );

    return getUnreadMessageCount(
      this.prisma,
      context.userId,
      context.cinemaId,
    );
  }

  async archiveMessage(
    id: number,
    actor: MessageActor,
    selectedCinemaId?:
      number | null,
  ) {
    const context =
      await resolveMessageActorContext(
        this.prisma,
        actor,
        selectedCinemaId,
      );

    return archiveMessageForUser(
      this.prisma,
      this.realtime,
      id,
      context.userId,
      context.cinemaId,
    );
  }

  async unarchiveMessage(
    id: number,
    actor: MessageActor,
    selectedCinemaId?:
      number | null,
  ) {
    const context =
      await resolveMessageActorContext(
        this.prisma,
        actor,
        selectedCinemaId,
      );

    return unarchiveMessageForUser(
      this.prisma,
      this.realtime,
      id,
      context.userId,
      context.cinemaId,
    );
  }

  async recallMessage(
    id: number,
    actor: MessageActor,
    selectedCinemaId?:
      number | null,
  ) {
    const context =
      await resolveMessageActorContext(
        this.prisma,
        actor,
        selectedCinemaId,
      );

    return recallMessageForUser(
      this.prisma,
      this.realtime,
      id,
      context.userId,
      context.cinemaId,
    );
  }
}
