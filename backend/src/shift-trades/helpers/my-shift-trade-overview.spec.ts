import {
  ShiftTradeStatus,
  ShiftTradeType,
} from '@prisma/client';

import {
  getCopenhagenMonthRange,
} from '../../shifts/helpers/my-shifts-month';
import {
  findMyShiftTradeOverview,
  myShiftTradeSelect,
} from './my-shift-trade-overview';

describe(
  'my shift-trade overview',
  () => {
    it('henter kun egne månedshandler og fremtidige direkte tilbud', async () => {
      const offeredTrades = [
        {
          id: 21,
        },
      ];
      const directTrades = [
        {
          id: 22,
        },
      ];
      const prisma = {
        shiftTrade: {
          findMany: jest
            .fn()
            .mockResolvedValueOnce(
              offeredTrades,
            )
            .mockResolvedValueOnce(
              directTrades,
            ),
        },
      };
      const now =
        new Date(
          '2026-08-01T08:00:00.000Z',
        );
      const range =
        getCopenhagenMonthRange(
          '2026-08',
        );

      await expect(
        findMyShiftTradeOverview(
          prisma as never,
          {
            userId: 9,
            cinemaId: 7,
            month: '2026-08',
            now,
          },
        ),
      ).resolves.toEqual({
        month: '2026-08',
        offeredTrades,
        directTrades,
      });

      expect(
        prisma.shiftTrade.findMany,
      ).toHaveBeenNthCalledWith(
        1,
        {
          where: {
            cinemaId: 7,
            status:
              ShiftTradeStatus.OPEN,
            offeredByUserId: 9,
            shift: {
              startTime: {
                lt: range.end,
              },
              endTime: {
                gt: range.start,
              },
            },
          },
          select:
            myShiftTradeSelect,
          orderBy: [
            {
              shift: {
                startTime: 'asc',
              },
            },
            {
              id: 'asc',
            },
          ],
        },
      );

      expect(
        prisma.shiftTrade.findMany,
      ).toHaveBeenNthCalledWith(
        2,
        {
          where: {
            cinemaId: 7,
            status:
              ShiftTradeStatus.OPEN,
            type:
              ShiftTradeType.DIRECT,
            targetUserId: 9,
            offeredByUserId: {
              not: 9,
            },
            shift: {
              startTime: {
                gt: now,
              },
            },
          },
          select:
            myShiftTradeSelect,
          orderBy: [
            {
              shift: {
                startTime: 'asc',
              },
            },
            {
              id: 'asc',
            },
          ],
        },
      );
    });
  },
);
