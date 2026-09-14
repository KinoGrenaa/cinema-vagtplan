import {
  ShiftTradeStatus,
  ShiftTradeType,
} from '@prisma/client';

import {
  buildClosedShiftTradeNotificationTargetWhere,
  buildOpenShiftTradeCategoryWhere,
  buildOpenShiftTradePageWhere,
  buildShiftTradeCursorPage,
  buildShiftTradeHistoryWhere,
  buildShiftTradeNotificationTargetAccessWhere,
  buildShiftTradeTargetWhere,
  findShiftTradePage,
  MAX_SHIFT_TRADE_PAGE_SIZE,
  normalizeShiftTradePageLimit,
} from './shift-trade-page';

describe(
  'shift-trade page',
  () => {
    const now =
      new Date(
        '2026-07-26T10:00:00.000Z',
      );

    it('begrænser sidestørrelsen', () => {
      expect(
        normalizeShiftTradePageLimit(
          500,
        ),
      ).toBe(
        MAX_SHIFT_TRADE_PAGE_SIZE,
      );
    });

    it('bevarer det kombinerede åbne filter', () => {
      expect(
        buildOpenShiftTradePageWhere(
          9,
          7,
          now,
        ),
      ).toEqual({
        cinemaId: 7,
        status:
          ShiftTradeStatus.OPEN,
        shift: {
          is: {
            startTime: {
              gt: now,
            },
            jobFunction: {
              userJobFunctions: {
                some: {
                  cinemaId: 7,
                  userId: 9,
                },
              },
            },
          },
        },
        OR: [
          {
            type:
              ShiftTradeType.DIRECT,
            targetUserId: 9,
          },
                    {
            type:
              ShiftTradeType.POOL,
            offeredByUserId: {
              not: 9,
            },
            declines: {
              none: {
                userId: 9,
              },
            },
          },
        ],
      });
    });
    it('bygger direkte cursorfilter', () => {
      expect(
        buildOpenShiftTradeCategoryWhere(
          9,
          7,
          now,
          ShiftTradeType.DIRECT,
          51,
        ),
      ).toEqual({
        cinemaId: 7,
        status:
          ShiftTradeStatus.OPEN,
        type:
          ShiftTradeType.DIRECT,
        shift: {
          is: {
            startTime: {
              gt: now,
            },
            jobFunction: {
              userJobFunctions: {
                some: {
                  cinemaId: 7,
                  userId: 9,
                },
              },
            },
          },
        },
        targetUserId: 9,
        id: {
          lt: 51,
        },
      });
    });

    it('bygger puljens cursorfilter', () => {
      expect(
        buildOpenShiftTradeCategoryWhere(
          9,
          7,
          now,
          ShiftTradeType.POOL,
        ),
      ).toEqual({
        cinemaId: 7,
        status:
          ShiftTradeStatus.OPEN,
        type:
          ShiftTradeType.POOL,
        shift: {
          is: {
            startTime: {
              gt: now,
            },
            jobFunction: {
              userJobFunctions: {
                some: {
                  cinemaId: 7,
                  userId: 9,
                },
              },
            },
          },
        },
                offeredByUserId: {
          not: 9,
        },
        declines: {
          none: {
            userId: 9,
          },
        },
      });
    });
    it('begrænser historik til brugerens deltagelse', () => {
      expect(
        buildShiftTradeHistoryWhere(
          9,
          7,
          50,
        ),
      ).toEqual({
        cinemaId: 7,
        status: {
          not:
            ShiftTradeStatus.OPEN,
        },
        OR: [
          {
            offeredByUserId:
              9,
          },
          {
            acceptedByUserId:
              9,
          },
          {
            targetUserId:
              9,
          },
        ],
        id: {
          lt: 50,
        },
      });
    });

    it('beskytter målrettede handler med samme synlighedsregler', () => {
      expect(
        buildShiftTradeTargetWhere(
          9,
          7,
          31,
          now,
        ),
      ).toEqual({
        id: 31,
        cinemaId: 7,
        OR: [
          {
            status: {
              not:
                ShiftTradeStatus.OPEN,
            },
            OR: [
              {
                offeredByUserId:
                  9,
              },
              {
                acceptedByUserId:
                  9,
              },
              {
                targetUserId:
                  9,
              },
            ],
          },
          {
            status:
              ShiftTradeStatus.OPEN,
            shift: {
              is: {
                startTime: {
                  gt: now,
                },
                jobFunction: {
                  userJobFunctions: {
                    some: {
                      cinemaId: 7,
                      userId: 9,
                    },
                  },
                },
              },
            },
            OR: [
              {
                type:
                  ShiftTradeType.DIRECT,
                targetUserId:
                  9,
              },
              {
                type:
                  ShiftTradeType.POOL,
                offeredByUserId: {
                  not: 9,
                },
                declines: {
                  none: {
                    userId: 9,
                  },
                },
              },
            ],
          },
        ],
      });
    });

    it('afgrænser notification-adgang til bruger, biograf og præcist vagtbytte', () => {
      expect(
        buildShiftTradeNotificationTargetAccessWhere(
          9,
          7,
          46,
        ),
      ).toEqual({
        userId: 9,
        cinemaId: 7,
        linkUrl:
          '/shift-trades?tradeId=46',
      });
    });

    it('notification-adgang kan kun hente et afsluttet vagtbytte i samme biograf', () => {
      expect(
        buildClosedShiftTradeNotificationTargetWhere(
          7,
          46,
        ),
      ).toEqual({
        id: 46,
        cinemaId: 7,
        status: {
          not:
            ShiftTradeStatus.OPEN,
        },
      });
    });

    it('bygger cursor og næste side', () => {
      expect(
        buildShiftTradeCursorPage(
          [
            {
              id: 12,
            },
            {
              id: 11,
            },
            {
              id: 10,
            },
          ],
          2,
        ),
      ).toEqual({
        items: [
          {
            id: 12,
          },
          {
            id: 11,
          },
        ],
        hasMore: true,
        nextBeforeId: 11,
      });
    });

    it('åbner et afsluttet puljetilbud fra brugerens egen notifikation', async () => {
      const closedTrade = {
        id: 46,
        cinemaId: 7,
        status:
          ShiftTradeStatus.CANCELLED,
        type:
          ShiftTradeType.POOL,
        shift: null,
      };
      const shiftTradeFindFirst =
        jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(
            closedTrade,
          );
      const prisma = {
        shiftTrade: {
          findMany: jest
            .fn()
            .mockResolvedValue([]),
          count: jest
            .fn()
            .mockResolvedValue(0),
          findFirst:
            shiftTradeFindFirst,
        },
        notification: {
          findFirst: jest
            .fn()
            .mockResolvedValue({
              id: 501,
            }),
        },
      };

      const result =
        await findShiftTradePage(
          prisma as never,
          9,
          7,
          {
            targetId: 46,
          },
        );

      expect(
        prisma.notification.findFirst,
      ).toHaveBeenCalledWith({
        where: {
          userId: 9,
          cinemaId: 7,
          linkUrl:
            '/shift-trades?tradeId=46',
        },
        select: {
          id: true,
        },
      });
      expect(
        shiftTradeFindFirst,
      ).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: {
            id: 46,
            cinemaId: 7,
            status: {
              not:
                ShiftTradeStatus.OPEN,
            },
          },
        }),
      );
      expect(result.target).toEqual({
        ...closedTrade,
        hasShiftConflict: false,
        approvedLeaveConflict: null,
      });
    });

    it('giver ikke notification-fallback uden en personlig notifikation', async () => {
      const shiftTradeFindFirst =
        jest
          .fn()
          .mockResolvedValueOnce(null);
      const prisma = {
        shiftTrade: {
          findMany: jest
            .fn()
            .mockResolvedValue([]),
          count: jest
            .fn()
            .mockResolvedValue(0),
          findFirst:
            shiftTradeFindFirst,
        },
        notification: {
          findFirst: jest
            .fn()
            .mockResolvedValue(null),
        },
      };

      const result =
        await findShiftTradePage(
          prisma as never,
          9,
          7,
          {
            targetId: 46,
          },
        );

      expect(result.target).toBeNull();
      expect(
        shiftTradeFindFirst,
      ).toHaveBeenCalledTimes(1);
    });
  },
);
