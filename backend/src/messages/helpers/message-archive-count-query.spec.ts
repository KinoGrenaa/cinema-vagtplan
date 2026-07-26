import {
  buildArchivedMessageCounts,
  buildArchivedMessageCountWhere,
} from './message-page';
import {
  findArchivedMessagePageForUser,
} from './message-read-flow';
import {
  messageInclude,
} from './message-shared';

describe('message archive counts', () => {
  it('bygger ét samlet adgangsfilter til arkivtællinger', () => {
    expect(
      buildArchivedMessageCountWhere(
        9,
        7,
      ),
    ).toEqual({
      cinemaId: 7,
      archivedAt: {
        not: null,
      },
      recalledAt: null,
      OR: [
        {
          senderId: 9,
        },
        {
          receiverId: 9,
        },
        {
          isBroadcast: true,
        },
      ],
    });
  });

  it('fordeler grupper på sendt og modtaget', () => {
    expect(
      buildArchivedMessageCounts(
        [
          {
            senderId: 9,
            _count: {
              _all: 4,
            },
          },
          {
            senderId: 12,
            _count: {
              _all: 5,
            },
          },
          {
            senderId: 15,
            _count: {
              _all: 3,
            },
          },
        ],
        9,
      ),
    ).toEqual({
      received: 8,
      sent: 4,
    });
  });

  it('bruger én grupperet tælling sammen med sideforespørgslen', async () => {
    const prisma = {
      message: {
        findMany:
          jest.fn().mockResolvedValue([
            {
              id: 31,
            },
          ]),
        groupBy:
          jest.fn().mockResolvedValue([
            {
              senderId: 9,
              _count: {
                _all: 2,
              },
            },
            {
              senderId: 12,
              _count: {
                _all: 6,
              },
            },
          ]),
        count: jest.fn(),
      },
    };

    await expect(
      findArchivedMessagePageForUser(
        prisma as never,
        9,
        7,
        {
          section: 'received',
          limit: 50,
        },
      ),
    ).resolves.toEqual({
      items: [
        {
          id: 31,
        },
      ],
      hasMore: false,
      nextBeforeId: null,
      counts: {
        received: 6,
        sent: 2,
      },
    });

    expect(
      prisma.message.findMany,
    ).toHaveBeenCalledWith({
      where: {
        cinemaId: 7,
        archivedAt: {
          not: null,
        },
        recalledAt: null,
        senderId: {
          not: 9,
        },
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
      orderBy: {
        id: 'desc',
      },
      take: 51,
    });
    expect(
      prisma.message.groupBy,
    ).toHaveBeenCalledWith({
      by: [
        'senderId',
      ],
      where: {
        cinemaId: 7,
        archivedAt: {
          not: null,
        },
        recalledAt: null,
        OR: [
          {
            senderId: 9,
          },
          {
            receiverId: 9,
          },
          {
            isBroadcast: true,
          },
        ],
      },
      _count: {
        _all: true,
      },
    });
    expect(
      prisma.message.count,
    ).not.toHaveBeenCalled();
  });
});
