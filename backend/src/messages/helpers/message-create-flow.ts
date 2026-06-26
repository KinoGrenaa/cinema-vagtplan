import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { CreateMessageDto } from '../dto/create-message.dto';
import { messageInclude, notifyMessagesUpdated } from './message-shared';

export type CreateMessageInput = CreateMessageDto & {
  cinemaId: number;
  senderId: number;
};

export async function createMessage(
  prisma: PrismaService,
  realtime: RealtimeGateway,
  data: CreateMessageInput,
) {
  const createdMessage = await prisma.message.create({
    data: {
      subject: data.subject,
      body: data.body,
      cinemaId: data.cinemaId,
      senderId: data.senderId,
      receiverId: data.receiverId || null,
      isBroadcast: data.isBroadcast || false,
    },
    include: messageInclude,
  });

  notifyMessagesUpdated(realtime, createdMessage);

  return createdMessage;
}
