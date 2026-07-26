import {
  ShiftTradeStatus,
  ShiftTradeType,
} from '@prisma/client';

import {
  buildOpenShiftTradePageWhere,
  buildShiftTradeHistoryPage,
  buildShiftTradeHistoryWhere,
  buildShiftTradeTargetWhere,
  MAX_SHIFT_TRADE_HISTORY_PAGE_SIZE,
  normalizeShiftTradeHistoryPageLimit,
} from './shift-trade-page';

describe(
  'shift-trade page',
  () => {
    const now =
      new Date(
        '2026-07-26T10:00:00.000Z',
      );

    it('begrænser historikkens sidestørrelse', () => {
      expect(
        normalizeShiftTradeHistoryPageLimit(
          500,
        ),
      ).toBe(
        MAX_SHIFT_TRADE_HISTORY_PAGE_SIZE,
      );
    });

    it('henter kun relevante åbne fremtidige handler', () => {
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
              startTime: {
                gt: now,
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
              },
            ],
          },
        ],
      });
    });

    it('bygger cursor og næste side', () => {
      expect(
        buildShiftTradeHistoryPage(
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
  },
);
