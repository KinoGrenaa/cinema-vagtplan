import { ForbiddenException } from '@nestjs/common';
import {
  archiveMessageForUser,
  markMessageAsRead,
  unarchiveMessageForUser,
} from './message-status-flow';

function createPrismaMock(
  initialMessage: Record<string, unknown>,
  mailbox:
    | Record<string, unknown>
    | null = null,
) {
  return {
    message: {
      findUnique:
        jest.fn().mockResolvedValue(
          initialMessage,
        ),
      update:
        jest.fn().mockResolvedValue(
          initialMessage,
        ),
    },
    messageRecipient: {
      findUnique:
        jest.fn().mockResolvedValue(
          mailbox,
        ),
      update:
        jest.fn(),
      updateMany:
        jest.fn().mockResolvedValue({
          count: 1,
        }),
    },
  };
}

function createRealtimeMock() {
  return {
    notifyCinema: jest.fn(),
  };
}

describe('message status access', () => {
  it('lader ikke afsender markere en direkte modtagers samtale som læst', async () => {
    const prisma =
      createPrismaMock(
        {
          id: 10,
          cinemaId: 3,
          senderId: 7,
          receiverId: 8,
          isBroadcast: false,
          conversationId:
            'conversation-10',
        },
        null,
      );

    await expect(
      markMessageAsRead(
        prisma as never,
        createRealtimeMock() as never,
        10,
        7,
        3,
      ),
    ).rejects.toThrow(
      ForbiddenException,
    );

    expect(
      prisma.messageRecipient.updateMany,
    ).not.toHaveBeenCalled();
    expect(
      prisma.message.update,
    ).not.toHaveBeenCalled();
  });

  it('markerer alle ulæste aktive mailbox-kopier i samtalen som læst', async () => {
    const readAt =
      new Date(
        '2026-09-07T06:30:00.000Z',
      );
    const rawAfter = {
      id: 10,
      cinemaId: 3,
      senderId: 7,
      receiverId: 8,
      isBroadcast: false,
      conversationId:
        'conversation-10',
      isRead: false,
      readAt: null,
      archivedAt: null,
      senderDeletedAt: null,
      recipients: [
        {
          readAt,
          deletedAt: null,
        },
      ],
    };
    const prisma =
      createPrismaMock(
        {
          id: 10,
          cinemaId: 3,
          senderId: 7,
          receiverId: 8,
          isBroadcast: false,
          conversationId:
            'conversation-10',
        },
        {
          readAt: null,
          deletedAt: null,
        },
      );
    prisma.message.findUnique
      .mockResolvedValueOnce({
        id: 10,
        cinemaId: 3,
        senderId: 7,
        receiverId: 8,
        isBroadcast: false,
        conversationId:
          'conversation-10',
      })
      .mockResolvedValueOnce(
        rawAfter,
      );
    const realtime =
      createRealtimeMock();

    await expect(
      markMessageAsRead(
        prisma as never,
        realtime as never,
        10,
        8,
        3,
      ),
    ).resolves.toMatchObject({
      id: 10,
      isRead: true,
      readAt,
    });

    expect(
      prisma.messageRecipient.updateMany,
    ).toHaveBeenCalledWith({
      where: {
        userId: 8,
        deletedAt: null,
        readAt: null,
        message: {
          is: {
            cinemaId: 3,
            conversationId:
              'conversation-10',
            recalledAt: null,
          },
        },
      },
      data: {
        readAt:
          expect.any(Date),
      },
    });
    expect(
      prisma.messageRecipient.update,
    ).not.toHaveBeenCalled();
    expect(
      prisma.message.update,
    ).not.toHaveBeenCalled();
    expect(
      realtime.notifyCinema,
    ).toHaveBeenCalled();
  });

  it('arkiverer modtagerens aktive mailbox-kopier for hele samtalen', async () => {
    const prisma =
      createPrismaMock(
        {
          id: 11,
          cinemaId: 3,
          senderId: 7,
          receiverId: null,
          isBroadcast: true,
          conversationId:
            'conversation-11',
        },
        {
          readAt: null,
          deletedAt: null,
        },
      );
    prisma.message.findUnique
      .mockResolvedValueOnce({
        id: 11,
        cinemaId: 3,
        senderId: 7,
        receiverId: null,
        isBroadcast: true,
        conversationId:
          'conversation-11',
      })
      .mockResolvedValueOnce({
        id: 11,
        cinemaId: 3,
        senderId: 7,
        receiverId: null,
        isBroadcast: true,
        conversationId:
          'conversation-11',
        isRead: false,
        readAt: null,
        archivedAt: null,
        senderDeletedAt: null,
        recipients: [
          {
            readAt: null,
            deletedAt:
              new Date(),
          },
        ],
      });

    await archiveMessageForUser(
      prisma as never,
      createRealtimeMock() as never,
      11,
      8,
      3,
    );

    expect(
      prisma.messageRecipient.updateMany,
    ).toHaveBeenCalledWith({
      where: {
        userId: 8,
        message: {
          is: {
            cinemaId: 3,
            conversationId:
              'conversation-11',
          },
        },
        deletedAt: null,
      },
      data: {
        deletedAt:
          expect.any(Date),
      },
    });
    expect(
      prisma.messageRecipient.update,
    ).not.toHaveBeenCalled();
    expect(
      prisma.message.update,
    ).not.toHaveBeenCalled();
  });

  it('gendanner modtagerens ikke-udløbne mailbox-kopier for hele samtalen', async () => {
    const deletedAt =
      new Date(
        '2026-09-01T10:00:00.000Z',
      );
    const prisma =
      createPrismaMock(
        {
          id: 11,
          cinemaId: 3,
          senderId: 7,
          receiverId: null,
          isBroadcast: true,
          conversationId:
            'conversation-11',
        },
        {
          readAt: null,
          deletedAt,
        },
      );
    prisma.message.findUnique
      .mockResolvedValueOnce({
        id: 11,
        cinemaId: 3,
        senderId: 7,
        receiverId: null,
        isBroadcast: true,
        conversationId:
          'conversation-11',
      })
      .mockResolvedValueOnce({
        id: 11,
        cinemaId: 3,
        senderId: 7,
        receiverId: null,
        isBroadcast: true,
        conversationId:
          'conversation-11',
        isRead: false,
        readAt: null,
        archivedAt: null,
        senderDeletedAt: null,
        recipients: [
          {
            readAt: null,
            deletedAt: null,
          },
        ],
      });

    await expect(
      unarchiveMessageForUser(
        prisma as never,
        createRealtimeMock() as never,
        11,
        8,
        3,
      ),
    ).resolves.toMatchObject({
      id: 11,
      archivedAt: null,
    });

    expect(
      prisma.messageRecipient.updateMany,
    ).toHaveBeenCalledWith({
      where: {
        userId: 8,
        message: {
          is: {
            cinemaId: 3,
            conversationId:
              'conversation-11',
          },
        },
        deletedAt: {
          gt:
            expect.any(Date),
        },
      },
      data: {
        deletedAt: null,
      },
    });
    expect(
      prisma.messageRecipient.update,
    ).not.toHaveBeenCalled();
    expect(
      prisma.message.update,
    ).not.toHaveBeenCalled();
  });

  it('lader afsender gendanne sin egen Sendt-kopi uden at ændre modtagere', async () => {
    const deletedAt =
      new Date(
        '2026-09-01T10:00:00.000Z',
      );
    const prisma =
      createPrismaMock({
        id: 11,
        cinemaId: 3,
        senderId: 7,
        receiverId: null,
        isBroadcast: true,
        conversationId:
          'conversation-11',
        senderDeletedAt:
          deletedAt,
      });
    prisma.message.findUnique
      .mockResolvedValueOnce({
        id: 11,
        cinemaId: 3,
        senderId: 7,
        receiverId: null,
        isBroadcast: true,
        conversationId:
          'conversation-11',
        senderDeletedAt:
          deletedAt,
      })
      .mockResolvedValueOnce({
        id: 11,
        cinemaId: 3,
        senderId: 7,
        receiverId: null,
        isBroadcast: true,
        conversationId:
          'conversation-11',
        isRead: false,
        readAt: null,
        archivedAt: null,
        senderDeletedAt: null,
        recipients: [],
      });

    await expect(
      unarchiveMessageForUser(
        prisma as never,
        createRealtimeMock() as never,
        11,
        7,
        3,
      ),
    ).resolves.toMatchObject({
      id: 11,
      archivedAt: null,
    });

    expect(
      prisma.message.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 11,
      },
      data: {
        senderDeletedAt: null,
      },
    });
    expect(
      prisma.messageRecipient.updateMany,
    ).not.toHaveBeenCalled();
  });
});
