import {
  findUnreadMessagesForNotifications,
} from './message-notification-overview';
import {
  findInboxMessagePageForUser,
} from './message-read-flow';
import {
  messageInclude,
  messageParticipantSelect,
} from './message-shared';

describe('message participant read shape', () => {
  it('henter kun deltagerfelterne som frontend bruger', () => {
    expect(messageParticipantSelect).toEqual({
      id: true,
      firstName: true,
      lastName: true,
    });
    expect(messageInclude).toEqual({
      sender: {
        select: messageParticipantSelect,
      },
      receiver: {
        select: messageParticipantSelect,
      },
    });
  });

  it('bruger det præcise deltagerselect i den paginerede indbakke', async () => {
    const prisma = {
      message: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
      },
    };

    await findInboxMessagePageForUser(
      prisma as never,
      9,
      7,
    );

    expect(
      prisma.message.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        include: messageInclude,
      }),
    );
    expect(
      prisma.message.findFirst,
    ).not.toHaveBeenCalled();
  });

  it('bruger samme deltagerselect i notifikationsoversigten', async () => {
    const prisma = {
      message: {
        findMany: jest.fn().mockResolvedValue([]),
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
        include: messageInclude,
      }),
    );
  });
});
