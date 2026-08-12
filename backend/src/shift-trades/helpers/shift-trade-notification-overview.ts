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

export const SHIFT_TRADE_NOTIFICATION_OVERVIEW_LIMIT =
  50;

function buildQualifiedLiveShiftWhere(
  userId: number,
  cinemaId: number,
  now: Date,
) {
  return {
    is: {
      startTime: {
        gt: now,
      },
      jobFunction: {
        userJobFunctions: {
          some: {
            cinemaId,
            userId,
          },
        },
      },
    },
  };
}

export function buildShiftTradeNotificationWhere(
  userId: number,
  cinemaId: number,
  now: Date,
): Prisma.ShiftTradeWhereInput {
  return {
    cinemaId,
    status: 'OPEN',
    shift: buildQualifiedLiveShiftWhere(
      userId,
      cinemaId,
      now,
    ),
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

export function buildShiftTradeNotificationCategoryWhere(
  userId: number,
  cinemaId: number,
  now: Date,
  type: ShiftTradeType,
): Prisma.ShiftTradeWhereInput {
  const base: Prisma.ShiftTradeWhereInput = {
    cinemaId,
    status: 'OPEN',
    shift: buildQualifiedLiveShiftWhere(
      userId,
      cinemaId,
      now,
    ),
    type,
  };

  if (type === ShiftTradeType.DIRECT) {
    return {
      ...base,
      targetUserId: userId,
    };
  }

  return {
    ...base,
    offeredByUserId: {
      not: userId,
    },
  };
}

export function buildShiftTradeNotificationCounts(
  groups: Array<{
    type: ShiftTradeType;
    _count: {
      _all: number;
    };
  }>,
) {
  return groups.reduce(
    (counts, group) => {
      if (group.type === ShiftTradeType.DIRECT) {
        counts.directTotal += group._count._all;
      } else if (group.type === ShiftTradeType.POOL) {
        counts.poolTotal += group._count._all;
      }

      return counts;
    },
    {
      directTotal: 0,
      poolTotal: 0,
    },
  );
}

export async function findShiftTradeNotificationOverview(
  prisma: PrismaService,
  userId: number,
  cinemaId: number,
) {
  const now = new Date();

  const [
    directTrades,
    poolTrades,
    countGroups,
  ] = await Promise.all([
    prisma.shiftTrade.findMany({
      where:
        buildShiftTradeNotificationCategoryWhere(
          userId,
          cinemaId,
          now,
          ShiftTradeType.DIRECT,
        ),
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
    prisma.shiftTrade.findMany({
      where:
        buildShiftTradeNotificationCategoryWhere(
          userId,
          cinemaId,
          now,
          ShiftTradeType.POOL,
        ),
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
    prisma.shiftTrade.groupBy({
      by: ['type'],
      where:
        buildShiftTradeNotificationWhere(
          userId,
          cinemaId,
          now,
        ),
      _count: {
        _all: true,
      },
    }),
  ]);

  return {
    directTrades,
    poolTrades,
    ...buildShiftTradeNotificationCounts(
      countGroups,
    ),
  };
}
