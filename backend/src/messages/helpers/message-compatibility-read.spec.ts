import {
  DEFAULT_MESSAGE_PAGE_SIZE,
} from './message-page';
import {
  findArchivedMessagesForUser,
  findMessagesForUser,
  findSentMessagesForUser,
} from './message-read-flow';
import {
  messageMailboxInclude,
  messageSentReceiptInclude,
} from './message-shared';

describe('message compatibility reads', () => {
  function createPrismaMock() {
    return {
      message: {
        findMany:
          jest.fn().mockResolvedValue(
            [],
          ),
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

  it('begrænser den kompatible indbakke til 50 beskeder', async () => {
    const prisma =
      createPrismaMock();

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
        recalledAt: null,
        recipients: {
          some: {
            userId: 9,
            deletedAt: null,
          },
        },
      },
      include:
        messageMailboxInclude(
          9,
        ),
      orderBy: stableOrder,
      take:
        DEFAULT_MESSAGE_PAGE_SIZE,
    });
  });

  it('begrænser den kompatible sendte liste til 50 beskeder', async () => {
    const prisma =
      createPrismaMock();

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
        senderDeletedAt: null,
      },
      include:
        messageSentReceiptInclude,
      orderBy: stableOrder,
      take:
        DEFAULT_MESSAGE_PAGE_SIZE,
    });
  });

  it('begrænser den kompatible slettet-liste til 50 beskeder på tværs af modtaget og sendt', async () => {
    const prisma =
      createPrismaMock();

    await findArchivedMessagesForUser(
      prisma as never,
      9,
      7,
    );

    expect(
      prisma.message.findMany,
    ).toHaveBeenCalledTimes(
      2,
    );

    expect(
      prisma.message.findMany,
    ).toHaveBeenNthCalledWith(
      1,
      {
        where: {
          cinemaId: 7,
          recalledAt: null,
          recipients: {
            some: {
              userId: 9,
              deletedAt: {
                gt:
                  expect.any(Date),
              },
            },
          },
        },
        include:
          messageMailboxInclude(
            9,
          ),
        orderBy:
          stableOrder,
        take:
          DEFAULT_MESSAGE_PAGE_SIZE,
      },
    );

    expect(
      prisma.message.findMany,
    ).toHaveBeenNthCalledWith(
      2,
      {
        where: {
          cinemaId: 7,
          recalledAt: null,
          senderId: 9,
          senderDeletedAt: {
            gt:
              expect.any(Date),
          },
        },
        include:
          messageMailboxInclude(
            9,
          ),
        orderBy:
          stableOrder,
        take:
          DEFAULT_MESSAGE_PAGE_SIZE,
      },
    );
  });
});
