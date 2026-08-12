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
  jobFunctionNameSnapshot: true,
  jobFunctionColorSnapshot: true,
  shift: {
    select: {
      startTime: true,
      endTime: true,
      jobFunction: {
        select: {
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

  return {
    month: range.month,
    offeredTrades,
    directTrades,
  };
}
