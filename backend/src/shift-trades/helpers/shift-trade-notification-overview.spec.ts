import {
  ShiftTradeType,
} from '@prisma/client';

import {
  SHIFT_TRADE_NOTIFICATION_OVERVIEW_LIMIT,
  buildShiftTradeNotificationCategoryWhere,
  buildShiftTradeNotificationCounts,
  buildShiftTradeNotificationWhere,
  findShiftTradeNotificationOverview,
} from './shift-trade-notification-overview';
import {
  shiftTradeInclude,
} from './shift-trade-service-helpers';

describe(
  'shift-trade notification overview',
  () => {
    const now = new Date(
      '2026-07-26T10:00:00.000Z',
    );

    it('henter kun aktive fremtidige direkte og puljehandler for brugeren', () => {
      expect(
        buildShiftTradeNotificationWhere(
          9,
          7,
          now,
        ),
      ).toEqual({
        cinemaId: 7,
        status: 'OPEN',
        shift: {
          startTime: {
            gt: now,
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
          },
        ],
      });
    });

    it('bygger præcise filtre pr. kategori', () => {
      expect(
        buildShiftTradeNotificationCategoryWhere(
          9,
          7,
          now,
          ShiftTradeType.DIRECT,
        ),
      ).toEqual({
        cinemaId: 7,
        status: 'OPEN',
        shift: {
          startTime: {
            gt: now,
          },
        },
        type: ShiftTradeType.DIRECT,
        targetUserId: 9,
      });

      expect(
        buildShiftTradeNotificationCategoryWhere(
          9,
          7,
          now,
          ShiftTradeType.POOL,
        ),
      ).toEqual({
        cinemaId: 7,
        status: 'OPEN',
        shift: {
          startTime: {
            gt: now,
          },
        },
        type: ShiftTradeType.POOL,
        offeredByUserId: {
          not: 9,
        },
      });
    });

    it('fordeler grupperede totaler', () => {
      expect(
        buildShiftTradeNotificationCounts([
          {
            type: ShiftTradeType.DIRECT,
            _count: {
              _all: 8,
            },
          },
          {
            type: ShiftTradeType.POOL,
            _count: {
              _all: 13,
            },
          },
        ]),
      ).toEqual({
        directTotal: 8,
        poolTotal: 13,
      });
    });

    it('returnerer højst 50 pr. kategori og præcise totaler', async () => {
      const directTrades = [
        {
          id: 21,
        },
      ];
      const poolTrades = [
        {
          id: 22,
        },
      ];
      const prisma = {
        shiftTrade: {
          findMany: jest
            .fn()
            .mockResolvedValueOnce(
              directTrades,
            )
            .mockResolvedValueOnce(
              poolTrades,
            ),
          groupBy: jest
            .fn()
            .mockResolvedValue([
              {
                type:
                  ShiftTradeType.DIRECT,
                _count: {
                  _all: 71,
                },
              },
              {
                type:
                  ShiftTradeType.POOL,
                _count: {
                  _all: 83,
                },
              },
            ]),
        },
      };

      await expect(
        findShiftTradeNotificationOverview(
          prisma as never,
          9,
          7,
        ),
      ).resolves.toEqual({
        directTrades,
        poolTrades,
        directTotal: 71,
        poolTotal: 83,
      });

      expect(
        prisma.shiftTrade.findMany,
      ).toHaveBeenCalledTimes(2);

      for (const call of prisma.shiftTrade.findMany.mock.calls) {
        expect(call[0]).toEqual(
          expect.objectContaining({
            include: shiftTradeInclude,
            orderBy: [
              {
                createdAt: 'desc',
              },
              {
                id: 'desc',
              },
            ],
            take:
              SHIFT_TRADE_NOTIFICATION_OVERVIEW_LIMIT,
          }),
        );
      }

      expect(
        prisma.shiftTrade.groupBy,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['type'],
          _count: {
            _all: true,
          },
        }),
      );
    });
  },
);
