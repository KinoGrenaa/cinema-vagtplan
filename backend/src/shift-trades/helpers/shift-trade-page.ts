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

export const DEFAULT_SHIFT_TRADE_PAGE_SIZE =
  50;
export const MAX_SHIFT_TRADE_PAGE_SIZE =
  100;

// Compatibility aliases for existing imports and tests.
export const DEFAULT_SHIFT_TRADE_HISTORY_PAGE_SIZE =
  DEFAULT_SHIFT_TRADE_PAGE_SIZE;
export const MAX_SHIFT_TRADE_HISTORY_PAGE_SIZE =
  MAX_SHIFT_TRADE_PAGE_SIZE;

export type ShiftTradePageOptions = {
  limit?: number;
  beforeId?: number;
  targetId?: number;
};

export type ShiftTradeOpenPageOptions = {
  type: ShiftTradeType;
  limit?: number;
  beforeId?: number;
};

export function normalizeShiftTradePageLimit(
  value?: number,
) {
  if (
    value === undefined ||
    value === null ||
    !Number.isInteger(value) ||
    value <= 0
  ) {
    return DEFAULT_SHIFT_TRADE_PAGE_SIZE;
  }

  return Math.min(
    value,
    MAX_SHIFT_TRADE_PAGE_SIZE,
  );
}

export const normalizeShiftTradeHistoryPageLimit =
  normalizeShiftTradePageLimit;

export function buildOpenShiftTradePageWhere(
  userId: number,
  cinemaId: number,
  now: Date,
): Prisma.ShiftTradeWhereInput {
  const qualifiedLiveShift = {
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

  return {
    cinemaId,
    status:
      ShiftTradeStatus.OPEN,
    shift:
      qualifiedLiveShift,
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

export function buildOpenShiftTradeCategoryWhere(
  userId: number,
  cinemaId: number,
  now: Date,
  type: ShiftTradeType,
  beforeId?: number,
): Prisma.ShiftTradeWhereInput {
  const base = {
    cinemaId,
    status:
      ShiftTradeStatus.OPEN,
    type,
    shift: {
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
    },
    ...(beforeId
      ? {
          id: {
            lt: beforeId,
          },
        }
      : {}),
  };

  if (
    type ===
    ShiftTradeType.DIRECT
  ) {
    return {
      ...base,
      targetUserId:
        userId,
    };
  }

  return {
    ...base,
    offeredByUserId: {
      not: userId,
    },
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

export function buildShiftTradeCursorPage<
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

export const buildShiftTradeHistoryPage =
  buildShiftTradeCursorPage;

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

function onlyTradesWithLiveShift<
  T extends {
    shift: unknown | null;
  },
>(
  trades: T[],
) {
  return trades.filter(
    (
      trade,
    ): trade is T & {
      shift: Exclude<
        T['shift'],
        null
      >;
    } =>
      trade.shift !== null,
  );
}

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

export async function findOpenShiftTradePage(
  prisma: PrismaService,
  userId: number,
  cinemaId: number,
  options: ShiftTradeOpenPageOptions,
) {
  const now = new Date();
  const limit =
    normalizeShiftTradePageLimit(
      options.limit,
    );
  const where =
    buildOpenShiftTradeCategoryWhere(
      userId,
      cinemaId,
      now,
      options.type,
      options.beforeId,
    );
  const totalWhere =
    buildOpenShiftTradeCategoryWhere(
      userId,
      cinemaId,
      now,
      options.type,
    );

  const [
    rows,
    totalCount,
  ] = await Promise.all([
    prisma.shiftTrade.findMany({
      where,
      include:
        shiftTradeInclude,
      orderBy: {
        id: 'desc',
      },
      take: limit + 1,
    }),
    prisma.shiftTrade.count({
      where: totalWhere,
    }),
  ]);

  const page =
    buildShiftTradeCursorPage(
      rows,
      limit,
    );
  const items =
    await addOpenTradeConflicts(
      prisma,
      userId,
      cinemaId,
      onlyTradesWithLiveShift(
        page.items,
      ),
    );

  return {
    ...page,
    items,
    totalCount,
  };
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
    normalizeShiftTradePageLimit(
      options.limit,
    );
  const directWhere =
    buildOpenShiftTradeCategoryWhere(
      userId,
      cinemaId,
      now,
      ShiftTradeType.DIRECT,
    );
  const poolWhere =
    buildOpenShiftTradeCategoryWhere(
      userId,
      cinemaId,
      now,
      ShiftTradeType.POOL,
    );

  const [
    directRows,
    poolRows,
    directTotalCount,
    poolTotalCount,
    historyRows,
    historyTotalCount,
    target,
  ] = await Promise.all([
    prisma.shiftTrade.findMany({
      where: directWhere,
      include:
        shiftTradeInclude,
      orderBy: {
        id: 'desc',
      },
      take: limit + 1,
    }),
    prisma.shiftTrade.findMany({
      where: poolWhere,
      include:
        shiftTradeInclude,
      orderBy: {
        id: 'desc',
      },
      take: limit + 1,
    }),
    prisma.shiftTrade.count({
      where: directWhere,
    }),
    prisma.shiftTrade.count({
      where: poolWhere,
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

  const directPage =
    buildShiftTradeCursorPage(
      directRows,
      limit,
    );
  const poolPage =
    buildShiftTradeCursorPage(
      poolRows,
      limit,
    );
  const openById =
    new Map(
      [
        ...onlyTradesWithLiveShift(
          directPage.items,
        ),
        ...onlyTradesWithLiveShift(
          poolPage.items,
        ),
      ].map(
        (trade) => [
          trade.id,
          trade,
        ],
      ),
    );

  if (
    target?.status ===
      ShiftTradeStatus.OPEN &&
    target.shift !== null &&
    !openById.has(target.id)
  ) {
    openById.set(
      target.id,
      {
        ...target,
        shift: target.shift,
      },
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
  const history =
    buildShiftTradeCursorPage(
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
    directTrades:
      directPage.items.map(
        (trade) =>
          annotatedOpenById.get(
            trade.id,
          ) ?? trade,
      ),
    poolTrades:
      poolPage.items.map(
        (trade) =>
          annotatedOpenById.get(
            trade.id,
          ) ?? trade,
      ),
    directPage: {
      hasMore:
        directPage.hasMore,
      nextBeforeId:
        directPage.nextBeforeId,
      totalCount:
        directTotalCount,
    },
    poolPage: {
      hasMore:
        poolPage.hasMore,
      nextBeforeId:
        poolPage.nextBeforeId,
      totalCount:
        poolTotalCount,
    },
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
