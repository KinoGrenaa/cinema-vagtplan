import {
  buildArchivedMessageCounts,
  buildArchivedMessageCountWhere,
} from './message-page';
import {
  findArchivedMessagePageForUser,
} from './message-read-flow';
import {
  getMessageDeletionCutoff,
} from './message-retention';
import {
  messageMailboxInclude,
} from './message-shared';

describe('message deleted counts', () => {
  it('bygger ét samlet adgangsfilter til slettet-tællinger', () => {
    const now =
      new Date(
        '2026-09-07T06:00:00.000Z',
      );
    const cutoff =
      getMessageDeletionCutoff(
        now,
      );

    expect(
      buildArchivedMessageCountWhere(
        9,
        7,
        now,
      ),
    ).toEqual({
      cinemaId: 7,
      recalledAt: null,
      OR: [
        {
          senderId: 9,
          senderDeletedAt: {
            gt: cutoff,
          },
        },
        {
          recipients: {
            some: {
              userId: 9,
              deletedAt: {
                gt: cutoff,
              },
            },
          },
        },
      ],
    });
  });

  it('bevarer den kompatible gruppefordeling for sendt og modtaget', () => {
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

  it('bevarer sendte arkivbeskeder enkeltvis men tæller modtagne arkiver som samtaler', async () => {
    const deletedAt =
      new Date(
        '2026-09-01T10:00:00.000Z',
      );

    const prisma = {
      $queryRaw:
        jest.fn()
          .mockResolvedValue([
            {
              count: 3,
            },
          ]),
      message: {
        findMany:
          jest.fn()
            .mockResolvedValue([
              {
                id: 31,
                senderId: 9,
                isRead: false,
                readAt: null,
                archivedAt: null,
                senderDeletedAt:
                  deletedAt,
                recipients: [],
              },
            ]),
        count:
          jest.fn()
            .mockResolvedValue(
              2,
            ),
      },
    };

    await expect(
      findArchivedMessagePageForUser(
        prisma as never,
        9,
        7,
        {
          section: 'sent',
          limit: 50,
        },
      ),
    ).resolves.toEqual({
      items: [
        {
          id: 31,
          senderId: 9,
          isRead: false,
          readAt: null,
          archivedAt:
            deletedAt,
        },
      ],
      hasMore: false,
      nextBeforeId: null,
      counts: {
        received: 3,
        sent: 2,
      },
    });

    expect(
      prisma.message.findMany,
    ).toHaveBeenCalledWith({
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
      orderBy: {
        id: 'desc',
      },
      take: 51,
    });

    expect(
      prisma.$queryRaw,
    ).toHaveBeenCalledTimes(
      1,
    );
    expect(
      prisma.message.count,
    ).toHaveBeenCalledTimes(
      1,
    );
  });
});
