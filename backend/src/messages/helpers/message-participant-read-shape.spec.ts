import {
  findUnreadMessagesForNotifications,
} from './message-notification-overview';
import {
  findInboxMessagePageForUser,
} from './message-read-flow';
import {
  messageInclude,
  messageMailboxInclude,
  messageParticipantSelect,
} from './message-shared';

describe('message participant read shape', () => {
  it('henter fortsat kun de deltagerfelter som frontend bruger', () => {
    expect(
      messageParticipantSelect,
    ).toEqual({
      id: true,
      firstName: true,
      lastName: true,
    });
    expect(
      messageInclude,
    ).toEqual({
      sender: {
        select:
          messageParticipantSelect,
      },
      receiver: {
        select:
          messageParticipantSelect,
      },
    });
  });

  it('udvider kun læsningen med den aktuelle brugers mailbox-state', () => {
    expect(
      messageMailboxInclude(
        9,
      ),
    ).toEqual({
      ...messageInclude,
      recipients: {
        where: {
          userId: 9,
        },
        select: {
          readAt: true,
          deletedAt: true,
        },
        take: 1,
      },
    });
  });

  it('bruger samtalepaginering i den paginerede indbakke', async () => {
    const prisma = {
      $queryRaw:
        jest.fn().mockResolvedValue(
          [],
        ),
      message: {
        findMany: jest.fn(),
      },
    };

    await findInboxMessagePageForUser(
      prisma as never,
      9,
      7,
    );

    expect(
      prisma.$queryRaw,
    ).toHaveBeenCalledTimes(
      1,
    );
    expect(
      prisma.message.findMany,
    ).not.toHaveBeenCalled();
  });

  it('bruger samme mailbox-shape i notifikationsoversigten', async () => {
    const prisma = {
      message: {
        findMany:
          jest.fn().mockResolvedValue(
            [],
          ),
        count:
          jest.fn().mockResolvedValue(
            0,
          ),
      },
    };

    await findUnreadMessagesForNotifications(
      prisma as never,
      9,
      7,
    );

    expect(
      prisma.message.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        include:
          messageMailboxInclude(
            9,
          ),
      }),
    );
  });
});
