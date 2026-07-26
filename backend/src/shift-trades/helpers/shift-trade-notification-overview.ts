import {
  Prisma,
  ShiftTradeType,
} from '@prisma/client';

import {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  shiftTradeInclude,
} from './shift-trade-service-helpers';

export function buildShiftTradeNotificationWhere(
  userId: number,
  cinemaId: number,
  now: Date,
): Prisma.ShiftTradeWhereInput {
  return {
    cinemaId,
    status: 'OPEN',
    shift: {
      startTime: {
        gt: now,
      },
    },
    OR: [
      {
        type: ShiftTradeType.DIRECT,
        targetUserId: userId,
      },
      {
        type: ShiftTradeType.POOL,
        offeredByUserId: {
          not: userId,
        },
      },
    ],
  };
}

export function splitShiftTradeNotificationOverview<
  T extends {
    type: ShiftTradeType;
  },
>(
  trades: T[],
) {
  return {
    directTrades:
      trades.filter(
        (trade) =>
          trade.type ===
          ShiftTradeType.DIRECT,
      ),
    poolTrades:
      trades.filter(
        (trade) =>
          trade.type ===
          ShiftTradeType.POOL,
      ),
  };
}

export async function findShiftTradeNotificationOverview(
  prisma: PrismaService,
  userId: number,
  cinemaId: number,
) {
  const trades =
    await prisma.shiftTrade.findMany({
      where:
        buildShiftTradeNotificationWhere(
          userId,
          cinemaId,
          new Date(),
        ),
      include:
        shiftTradeInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

  return splitShiftTradeNotificationOverview(
    trades,
  );
}
