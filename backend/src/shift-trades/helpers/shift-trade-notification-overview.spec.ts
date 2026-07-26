import {
  ShiftTradeType,
} from '@prisma/client';

import {
  buildShiftTradeNotificationWhere,
  splitShiftTradeNotificationOverview,
} from './shift-trade-notification-overview';

describe(
  'shift-trade notification overview',
  () => {
    it('henter kun aktive fremtidige direkte og puljehandler for brugeren', () => {
      const now =
        new Date(
          '2026-07-26T10:00:00.000Z',
        );

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

    it('opdeler resultatet i direkte handler og puljehandler', () => {
      expect(
        splitShiftTradeNotificationOverview(
          [
            {
              id: 1,
              type:
                ShiftTradeType.POOL,
            },
            {
              id: 2,
              type:
                ShiftTradeType.DIRECT,
            },
          ],
        ),
      ).toEqual({
        directTrades: [
          {
            id: 2,
            type:
              ShiftTradeType.DIRECT,
          },
        ],
        poolTrades: [
          {
            id: 1,
            type:
              ShiftTradeType.POOL,
          },
        ],
      });
    });
  },
);
