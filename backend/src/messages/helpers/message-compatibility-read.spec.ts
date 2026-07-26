import {
  DEFAULT_MESSAGE_PAGE_SIZE,
} from './message-page';
import {
  findArchivedMessagesForUser,
  findMessagesForUser,
  findSentMessagesForUser,
} from './message-read-flow';
import {
  messageInclude,
} from './message-shared';

describe('message compatibility reads', () => {
  function createPrismaMock() {
    return {
      message: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
  }

  const stableOrder = [
    {
      createdAt: 'desc',
    },
    {
      id: 'desc',
    },
  ];

  it('begrænser den gamle indbakke til 50 beskeder', async () => {
    const prisma = createPrismaMock();

    await findMessagesForUser(
      prisma as never,
      9,
      7,
    );

    expect(
      prisma.message.findMany,
    ).toHaveBeenCalledWith({
      where: {
        cinemaId: 7,
        archivedAt: null,
        recalledAt: null,
        OR: [
          {
            receiverId: 9,
          },
          {
            isBroadcast: true,
          },
        ],
      },
      include: messageInclude,
      orderBy: stableOrder,
      take: DEFAULT_MESSAGE_PAGE_SIZE,
    });
  });

  it('begrænser den gamle sendte liste til 50 beskeder', async () => {
    const prisma = createPrismaMock();

    await findSentMessagesForUser(
      prisma as never,
      9,
      7,
    );

    expect(
      prisma.message.findMany,
    ).toHaveBeenCalledWith({
      where: {
        cinemaId: 7,
        senderId: 9,
        archivedAt: null,
      },
      include: messageInclude,
      orderBy: stableOrder,
      take: DEFAULT_MESSAGE_PAGE_SIZE,
    });
  });

  it('begrænser det gamle arkiv til 50 beskeder', async () => {
    const prisma = createPrismaMock();

    await findArchivedMessagesForUser(
      prisma as never,
      9,
      7,
    );

    expect(
      prisma.message.findMany,
    ).toHaveBeenCalledWith({
      where: {
        cinemaId: 7,
        archivedAt: {
          not: null,
        },
        recalledAt: null,
        OR: [
          {
            receiverId: 9,
          },
          {
            isBroadcast: true,
          },
          {
            senderId: 9,
          },
        ],
      },
      include: messageInclude,
      orderBy: stableOrder,
      take: DEFAULT_MESSAGE_PAGE_SIZE,
    });
  });
});
