import {
  ForbiddenException,
} from '@nestjs/common';
import {
  createMessage,
} from './message-create-flow';

describe('message groups and replies', () => {
  const realtime = {
    notifyCinema: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opretter én besked med flere individuelle recipients', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn(({ where }: any) =>
          Promise.resolve({ id: where.id }),
        ),
        findMany: jest.fn().mockResolvedValue([
          { id: 3 },
          { id: 4 },
          { id: 5 },
        ]),
      },
      message: {
        findUnique: jest.fn(),
        create: jest.fn(({ data }: any) =>
          Promise.resolve({
            id: 10,
            cinemaId: 1,
            ...data,
          }),
        ),
      },
    };

    await createMessage(
      prisma as never,
      realtime as never,
      {
        subject: 'Gruppetest',
        body: 'Hej flere',
        recipientIds: [3, 4],
        isBroadcast: false,
        cinemaId: 1,
        senderId: 2,
        senderRole: 'EMPLOYEE',
      },
    );

    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          receiverId: null,
          isBroadcast: false,
          recipients: {
            create: [
              { userId: 3 },
              { userId: 4 },
            ],
          },
        }),
      }),
    );
  });

  it('reply all arver samtalen og tager kun stadig relevante snapshot-modtagere med', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn(({ where }: any) =>
          Promise.resolve({ id: where.id }),
        ),
        findMany: jest.fn(),
      },
      message: {
        findUnique: jest.fn().mockResolvedValue({
          id: 20,
          cinemaId: 1,
          senderId: 2,
          senderDeletedAt: null,
          isBroadcast: false,
          conversationId: 'thread-1',
          recipients: [
            {
              userId: 3,
              deletedAt: null,
              receiptExcludedAt: null,
            },
            {
              userId: 4,
              deletedAt: null,
              receiptExcludedAt: null,
            },
            {
              userId: 5,
              deletedAt: null,
              receiptExcludedAt: new Date(),
            },
          ],
        }),
        create: jest.fn(({ data }: any) =>
          Promise.resolve({
            id: 21,
            cinemaId: 1,
            ...data,
          }),
        ),
      },
    };

    await createMessage(
      prisma as never,
      realtime as never,
      {
        subject: 'Sv: Gruppetest',
        body: 'Mit svar',
        isBroadcast: false,
        replyToMessageId: 20,
        replyMode: 'REPLY_ALL',
        cinemaId: 1,
        senderId: 3,
        senderRole: 'EMPLOYEE',
      },
    );

    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conversationId: 'thread-1',
          replyToMessageId: 20,
          receiverId: null,
          recipients: {
            create: [
              { userId: 2 },
              { userId: 4 },
            ],
          },
        }),
      }),
    );
  });

  it('almindelig medarbejder kan ikke svare alle på fuld broadcast', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      message: {
        findUnique: jest.fn().mockResolvedValue({
          id: 30,
          cinemaId: 1,
          senderId: 2,
          senderDeletedAt: null,
          isBroadcast: true,
          conversationId: 'thread-2',
          recipients: [
            {
              userId: 3,
              deletedAt: null,
              receiptExcludedAt: null,
            },
            {
              userId: 4,
              deletedAt: null,
              receiptExcludedAt: null,
            },
          ],
        }),
        create: jest.fn(),
      },
    };

    await expect(
      createMessage(
        prisma as never,
        realtime as never,
        {
          subject: 'Sv: Broadcast',
          body: 'Svar alle',
          isBroadcast: false,
          replyToMessageId: 30,
          replyMode: 'REPLY_ALL',
          cinemaId: 1,
          senderId: 3,
          senderRole: 'EMPLOYEE',
          senderCanSendBroadcastMessages: false,
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.message.create).not.toHaveBeenCalled();
  });
});
