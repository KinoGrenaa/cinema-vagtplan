import {
  ShiftTradeStatus,
  ShiftTradeType,
} from '@prisma/client';

import type {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  getCopenhagenMonthRange,
} from '../../shifts/helpers/my-shifts-month';
import {
  shiftTradeParticipantSelect,
} from './shift-trade-service-helpers';
import {
  buildShiftTradePoolResponseSummary,
} from './shift-trade-pool-response-summary';

export const myShiftTradeSelect = {
  id: true,
  status: true,
  type: true,
  shiftId: true,
  offeredByUserId: true,
  targetUserId: true,
  offeredByUser: {
    select:
      shiftTradeParticipantSelect,
  },
  targetUser: {
    select:
      shiftTradeParticipantSelect,
  },
  shiftStartTimeSnapshot: true,
  shiftEndTimeSnapshot: true,
  jobFunctionIdSnapshot: true,
  jobFunctionNameSnapshot: true,
  jobFunctionColorSnapshot: true,
  declines: {
    select: {
      userId: true,
      declinedAt: true,
      user: {
        select:
          shiftTradeParticipantSelect,
      },
    },
    orderBy: {
      declinedAt: 'asc',
    },
  },
  shift: {
    select: {
      startTime: true,
      endTime: true,
      jobFunction: {
        select: {
          id: true,
          name: true,
        },
      },
      jobFunctionNameSnapshot: true,
    },
  },
} as const;

export async function findMyShiftTradeOverview(
  prisma: PrismaService,
  params: {
    userId: number;
    cinemaId: number;
    month: unknown;
    now?: Date;
  },
) {
  const range =
    getCopenhagenMonthRange(
      params.month,
    );
  const now =
    params.now ?? new Date();

  const [
    offeredTrades,
    directTrades,
  ] = await Promise.all([
    prisma.shiftTrade.findMany({
      where: {
        cinemaId:
          params.cinemaId,
        status:
          ShiftTradeStatus.OPEN,
        offeredByUserId:
          params.userId,
        shift: {
          is: {
            startTime: {
              lt: range.end,
            },
            endTime: {
              gt: range.start,
            },
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
    }),
    prisma.shiftTrade.findMany({
      where: {
        cinemaId:
          params.cinemaId,
        status:
          ShiftTradeStatus.OPEN,
        type:
          ShiftTradeType.DIRECT,
        targetUserId:
          params.userId,
        offeredByUserId: {
          not:
            params.userId,
        },
        shift: {
          is: {
            startTime: {
              gt: now,
            },
            jobFunction: {
              userJobFunctions: {
                some: {
                  cinemaId:
                    params.cinemaId,
                  userId:
                    params.userId,
                },
              },
            },
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
    }),
  ]);

  const poolTrades =
    offeredTrades.filter(
      (trade) =>
        trade.type ===
        ShiftTradeType.POOL,
    );
  const poolJobFunctionIds =
    [
      ...new Set(
        poolTrades.map(
          (trade) =>
            trade.shift?.jobFunction
              ?.id ??
            trade.jobFunctionIdSnapshot,
        ),
      ),
    ];
  const qualifiedPoolRecipients =
    poolJobFunctionIds.length > 0
      ? await prisma.user.findMany({
          where: {
            id: {
              not:
                params.userId,
            },
            isActive: true,
            role: {
              not: 'MASTER',
            },
            cinemaMemberships: {
              some: {
                cinemaId:
                  params.cinemaId,
                isActive: true,
              },
            },
            userJobFunctions: {
              some: {
                cinemaId:
                  params.cinemaId,
                jobFunctionId: {
                  in:
                    poolJobFunctionIds,
                },
              },
            },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            userJobFunctions: {
              where: {
                cinemaId:
                  params.cinemaId,
                jobFunctionId: {
                  in:
                    poolJobFunctionIds,
                },
              },
              select: {
                jobFunctionId: true,
              },
            },
          },
          orderBy: [
            {
              firstName: 'asc',
            },
            {
              lastName: 'asc',
            },
            {
              id: 'asc',
            },
          ],
        })
      : [];

  return {
    month: range.month,
    offeredTrades:
      offeredTrades.map(
        (trade) => {
          if (
            trade.type !==
            ShiftTradeType.POOL
          ) {
            return trade;
          }

          const jobFunctionId =
            trade.shift?.jobFunction
              ?.id ??
            trade.jobFunctionIdSnapshot;

          return {
            ...trade,
            poolResponseSummary:
              buildShiftTradePoolResponseSummary(
                jobFunctionId,
                qualifiedPoolRecipients,
                trade.declines,
              ),
          };
        },
      ),
    directTrades,
  };
}
