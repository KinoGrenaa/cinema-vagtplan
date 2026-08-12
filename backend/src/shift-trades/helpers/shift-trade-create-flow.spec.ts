import {
  ShiftTradeType,
} from '@prisma/client';

import {
  NotificationsService,
} from '../../notifications/notifications.service';
import {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  PushService,
} from '../../push/push.service';
import {
  RealtimeGateway,
} from '../../realtime/realtime.gateway';
import {
  createShiftTrade,
} from './shift-trade-create-flow';

describe(
  'shift trade create flow',
  () => {
    it('låser pool-vagten med PostgreSQL integer/integer-signaturen', async () => {
      const trade = {
        id: 71,
        cinemaId: 7,
        shiftId: 41,
        offeredByUserId: 21,
        type:
          ShiftTradeType.POOL,
        targetUserId: null,
      };
      const tx = {
        $queryRaw:
          jest.fn().mockResolvedValue(
            [],
          ),
        shift: {
          findFirst:
            jest.fn().mockResolvedValue({
              id: 41,
              userId: 21,
              startTime:
                new Date(
                  '2099-01-01T18:00:00.000Z',
                ),
            }),
        },
        shiftTrade: {
          findFirst:
            jest.fn().mockResolvedValue(
              null,
            ),
          create:
            jest.fn().mockResolvedValue(
              trade,
            ),
        },
      };
      const prisma = {
        cinema: {
          findUnique:
            jest.fn().mockResolvedValue({
              id: 7,
              allowShiftTradePool:
                true,
              allowShiftTradeDirect:
                true,
            }),
        },
        user: {
          findFirst:
            jest.fn().mockResolvedValue({
              id: 21,
            }),
        },
        $transaction:
          jest.fn(
            async (
              callback:
                (
                  client:
                    typeof tx,
                ) =>
                  Promise<unknown>,
            ) =>
              callback(tx),
          ),
      };
      const realtime = {
        notifyCinema: jest.fn(),
      };
      const notifications = {
        create: jest.fn(),
      };
      const push = {
        sendToUserInCinema:
          jest.fn(),
      };

      await expect(
        createShiftTrade(
          {
            prisma:
              prisma as unknown as PrismaService,
            realtime:
              realtime as unknown as RealtimeGateway,
            notifications:
              notifications as unknown as NotificationsService,
            push:
              push as unknown as PushService,
          },
          {
            shiftId: 41,
            offeredByUserId: 21,
            cinemaId: 7,
            type:
              ShiftTradeType.POOL,
          },
        ),
      ).resolves.toBe(trade);

      expect(
        tx.$queryRaw,
      ).toHaveBeenCalledTimes(1);
      const query =
        tx.$queryRaw.mock
          .calls[0][0] as {
          sql?: string;
          values?: unknown[];
        };

      expect(query.sql).toContain(
        'SELECT CAST(COUNT(*) AS integer) AS "lockAcquired"',
      );
      expect(query.sql).toContain(
        'FROM pg_advisory_xact_lock',
      );
      expect(query.sql).toContain(
        'CAST(53001 AS integer)',
      );
      expect(query.sql).toContain(
        'CAST(? AS integer)',
      );
      expect(query.values).toEqual([
        41,
      ]);
      expect(
        realtime.notifyCinema,
      ).toHaveBeenCalledWith(
        7,
        'shiftTradesUpdated',
        trade,
      );
      expect(
        notifications.create,
      ).not.toHaveBeenCalled();
      expect(
        push.sendToUserInCinema,
      ).not.toHaveBeenCalled();
    });
  },
);
