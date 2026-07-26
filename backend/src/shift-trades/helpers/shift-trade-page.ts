import {
  LeaveStatus,
  Prisma,
  ShiftTradeStatus,
  ShiftTradeType,
} from '@prisma/client';

import {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  shiftTradeInclude,
} from './shift-trade-service-helpers';

export const DEFAULT_SHIFT_TRADE_HISTORY_PAGE_SIZE =
  50;
export const MAX_SHIFT_TRADE_HISTORY_PAGE_SIZE =
  100;

export type ShiftTradePageOptions = {
  limit?: number;
  beforeId?: number;
  targetId?: number;
};

export function normalizeShiftTradeHistoryPageLimit(
  value?: number,
) {
  if (
    value === undefined ||
    value === null
  ) {
    return DEFAULT_SHIFT_TRADE_HISTORY_PAGE_SIZE;
  }

  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    return DEFAULT_SHIFT_TRADE_HISTORY_PAGE_SIZE;
  }

  return Math.min(
    value,
    MAX_SHIFT_TRADE_HISTORY_PAGE_SIZE,
  );
}

export function buildOpenShiftTradePageWhere(
  userId: number,
  cinemaId: number,
  now: Date,
): Prisma.ShiftTradeWhereInput {
  return {
    cinemaId,
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
        targetUserId: userId,
      },
      {
        type:
          ShiftTradeType.POOL,
        offeredByUserId: {
          not: userId,
        },
      },
    ],
  };
}

export function buildShiftTradeHistoryWhere(
  userId: number,
  cinemaId: number,
  beforeId?: number,
): Prisma.ShiftTradeWhereInput {
  return {
    cinemaId,
    status: {
      not:
        ShiftTradeStatus.OPEN,
    },
    OR: [
      {
        offeredByUserId:
          userId,
      },
      {
        acceptedByUserId:
          userId,
      },
      {
        targetUserId:
          userId,
      },
    ],
    ...(beforeId
      ? {
          id: {
            lt: beforeId,
          },
        }
      : {}),
  };
}

export function buildShiftTradeTargetWhere(
  userId: number,
  cinemaId: number,
  targetId: number,
  now: Date,
): Prisma.ShiftTradeWhereInput {
  return {
    id: targetId,
    cinemaId,
    OR: [
      {
        status: {
          not:
            ShiftTradeStatus.OPEN,
        },
        OR: [
          {
            offeredByUserId:
              userId,
          },
          {
            acceptedByUserId:
              userId,
          },
          {
            targetUserId:
              userId,
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
              userId,
          },
          {
            type:
              ShiftTradeType.POOL,
            offeredByUserId: {
              not: userId,
            },
          },
        ],
      },
    ],
  };
}

export function buildShiftTradeHistoryPage<
  T extends {
    id: number;
  },
>(
  rows: T[],
  limit: number,
) {
  const items =
    rows.slice(0, limit);
  const hasMore =
    rows.length > limit;

  return {
    items,
    hasMore,
    nextBeforeId:
      hasMore &&
      items.length > 0
        ? items[
            items.length - 1
          ].id
        : null,
  };
}

type ShiftTradeWithShift = {
  id: number;
  status:
    ShiftTradeStatus;
  type:
    ShiftTradeType;
  shift: {
    id: number;
    startTime: Date;
    endTime: Date;
  };
};

async function addOpenTradeConflicts<
  T extends ShiftTradeWithShift,
>(
  prisma: PrismaService,
  userId: number,
  cinemaId: number,
  trades: T[],
) {
  if (trades.length === 0) {
    return [] as Array<
      T & {
        hasShiftConflict:
          boolean;
        approvedLeaveConflict:
          | {
              id: number;
              startDate: Date;
              endDate: Date;
            }
          | null;
      }
    >;
  }

  const earliestStartTime =
    new Date(
      Math.min(
        ...trades.map(
          (trade) =>
            trade.shift.startTime.getTime(),
        ),
      ),
    );
  const latestEndTime =
    new Date(
      Math.max(
        ...trades.map(
          (trade) =>
            trade.shift.endTime.getTime(),
        ),
      ),
    );

  const [
    ownShifts,
    approvedLeaveRequests,
  ] = await Promise.all([
    prisma.shift.findMany({
      where: {
        cinemaId,
        userId,
        startTime: {
          lt: latestEndTime,
        },
        endTime: {
          gt: earliestStartTime,
        },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        cinemaId,
        userId,
        status:
          LeaveStatus.APPROVED,
        startDate: {
          lt: latestEndTime,
        },
        endDate: {
          gt: earliestStartTime,
        },
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    }),
  ]);

  return trades.map(
    (trade) => ({
      ...trade,
      hasShiftConflict:
        ownShifts.some(
          (shift) =>
            shift.id !==
              trade.shift.id &&
            shift.startTime <
              trade.shift.endTime &&
            shift.endTime >
              trade.shift.startTime,
        ),
      approvedLeaveConflict:
        approvedLeaveRequests.find(
          (leaveRequest) =>
            leaveRequest.startDate <
              trade.shift.endTime &&
            leaveRequest.endDate >
              trade.shift.startTime,
        ) ?? null,
    }),
  );
}

export async function findShiftTradePage(
  prisma: PrismaService,
  userId: number,
  cinemaId: number,
  options:
    ShiftTradePageOptions = {},
) {
  const now = new Date();
  const limit =
    normalizeShiftTradeHistoryPageLimit(
      options.limit,
    );

  const [
    openTrades,
    historyRows,
    historyTotalCount,
    target,
  ] = await Promise.all([
    prisma.shiftTrade.findMany({
      where:
        buildOpenShiftTradePageWhere(
          userId,
          cinemaId,
          now,
        ),
      include:
        shiftTradeInclude,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.shiftTrade.findMany({
      where:
        buildShiftTradeHistoryWhere(
          userId,
          cinemaId,
          options.beforeId,
        ),
      include:
        shiftTradeInclude,
      orderBy: {
        id: 'desc',
      },
      take: limit + 1,
    }),
    prisma.shiftTrade.count({
      where:
        buildShiftTradeHistoryWhere(
          userId,
          cinemaId,
        ),
    }),
    options.targetId
      ? prisma.shiftTrade.findFirst({
          where:
            buildShiftTradeTargetWhere(
              userId,
              cinemaId,
              options.targetId,
              now,
            ),
          include:
            shiftTradeInclude,
        })
      : Promise.resolve(null),
  ]);

  const openById =
    new Map(
      openTrades.map(
        (trade) => [
          trade.id,
          trade,
        ],
      ),
    );

  if (
    target?.status ===
      ShiftTradeStatus.OPEN &&
    !openById.has(target.id)
  ) {
    openById.set(
      target.id,
      target,
    );
  }

  const annotatedOpenTrades =
    await addOpenTradeConflicts(
      prisma,
      userId,
      cinemaId,
      [
        ...openById.values(),
      ],
    );
  const annotatedOpenById =
    new Map(
      annotatedOpenTrades.map(
        (trade) => [
          trade.id,
          trade,
        ],
      ),
    );

  const directTrades =
    annotatedOpenTrades.filter(
      (trade) =>
        trade.type ===
        ShiftTradeType.DIRECT,
    );
  const poolTrades =
    annotatedOpenTrades.filter(
      (trade) =>
        trade.type ===
        ShiftTradeType.POOL,
    );
  const history =
    buildShiftTradeHistoryPage(
      historyRows.map(
        (trade) => ({
          ...trade,
          hasShiftConflict:
            false,
          approvedLeaveConflict:
            null,
        }),
      ),
      limit,
    );

  return {
    directTrades,
    poolTrades,
    history: {
      ...history,
      totalCount:
        historyTotalCount,
    },
    target:
      target?.status ===
      ShiftTradeStatus.OPEN
        ? annotatedOpenById.get(
            target.id,
          ) ?? null
        : target
          ? {
              ...target,
              hasShiftConflict:
                false,
              approvedLeaveConflict:
                null,
            }
          : null,
  };
}
