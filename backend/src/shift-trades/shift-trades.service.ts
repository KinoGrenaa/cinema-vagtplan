import {
  Injectable,
} from '@nestjs/common';
import {
  LeaveStatus,
  ShiftTradeStatus,
  ShiftTradeType,
} from '@prisma/client';
import {
  NotificationsService,
} from '../notifications/notifications.service';
import {
  PrismaService,
} from '../prisma/prisma.service';
import {
  PushService,
} from '../push/push.service';
import {
  RealtimeGateway,
} from '../realtime/realtime.gateway';
import {
  acceptShiftTrade,
} from './helpers/shift-trade-accept-flow';
import {
  resolveShiftTradeActorContext,
  resolveShiftTradeActorUserId,
} from './helpers/shift-trade-accept-validation';
import {
  cancelShiftTrade,
} from './helpers/shift-trade-cancel-flow';
import {
  createShiftTrade,
} from './helpers/shift-trade-create-flow';
import {
  findShiftTradeNotificationOverview,
} from './helpers/shift-trade-notification-overview';
import {
  findShiftTradePage,
  type ShiftTradePageOptions,
} from './helpers/shift-trade-page';
import {
  rejectShiftTrade,
} from './helpers/shift-trade-reject-flow';
import {
  getShiftTradeCinemaFilter,
  resolveShiftTradeCinemaId,
  shiftTradeInclude,
} from './helpers/shift-trade-service-helpers';

@Injectable()
export class ShiftTradesService {
  constructor(
    private readonly prisma:
      PrismaService,
    private readonly realtime:
      RealtimeGateway,
    private readonly notifications:
      NotificationsService,
    private readonly push:
      PushService,
  ) {}

  async findAll(
    user: any,
    selectedCinemaId?:
      number | null,
  ) {
    const cinemaId =
      resolveShiftTradeCinemaId(
        user,
        selectedCinemaId,
      );
    const trades =
      await this.prisma.shiftTrade.findMany({
        where:
          getShiftTradeCinemaFilter(
            user,
            selectedCinemaId,
          ),
        include:
          shiftTradeInclude,
        orderBy: {
          createdAt: 'desc',
        },
      });
    const userId =
      resolveShiftTradeActorUserId(
        user,
      );
    const now = new Date();
    const acceptableTrades =
      trades.filter((trade) => {
        if (
          trade.status !==
            ShiftTradeStatus.OPEN ||
          trade.offeredByUserId ===
            userId ||
          trade.shift.startTime <=
            now
        ) {
          return false;
        }

        if (
          trade.type ===
          ShiftTradeType.POOL
        ) {
          return true;
        }

        return (
          trade.targetUserId ===
          userId
        );
      });

    if (
      acceptableTrades.length ===
      0
    ) {
      return trades.map(
        (trade) => ({
          ...trade,
          approvedLeaveConflict:
            null,
        }),
      );
    }

    const earliestStartTime =
      new Date(
        Math.min(
          ...acceptableTrades.map(
            (trade) =>
              trade.shift.startTime.getTime(),
          ),
        ),
      );
    const latestEndTime =
      new Date(
        Math.max(
          ...acceptableTrades.map(
            (trade) =>
              trade.shift.endTime.getTime(),
          ),
        ),
      );
    const approvedLeaveRequests =
      await this.prisma.leaveRequest.findMany({
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
      });
    const acceptableTradeIds =
      new Set(
        acceptableTrades.map(
          (trade) =>
            trade.id,
        ),
      );

    return trades.map(
      (trade) => {
        if (
          !acceptableTradeIds.has(
            trade.id,
          )
        ) {
          return {
            ...trade,
            approvedLeaveConflict:
              null,
          };
        }

        const approvedLeaveConflict =
          approvedLeaveRequests.find(
            (leaveRequest) =>
              leaveRequest.startDate <
                trade.shift.endTime &&
              leaveRequest.endDate >
                trade.shift.startTime,
          ) ?? null;

        return {
          ...trade,
          approvedLeaveConflict,
        };
      },
    );
  }

  async findPage(
    user: any,
    selectedCinemaId:
      number | null | undefined,
    options:
      ShiftTradePageOptions = {},
  ) {
    const cinemaId =
      resolveShiftTradeCinemaId(
        user,
        selectedCinemaId,
      );
    const userId =
      resolveShiftTradeActorUserId(
        user,
      );

    return findShiftTradePage(
      this.prisma,
      userId,
      cinemaId,
      options,
    );
  }

  async getNotificationOverview(
    user: any,
    selectedCinemaId?:
      number | null,
  ) {
    const cinemaId =
      resolveShiftTradeCinemaId(
        user,
        selectedCinemaId,
      );
    const userId =
      resolveShiftTradeActorUserId(
        user,
      );

    return findShiftTradeNotificationOverview(
      this.prisma,
      userId,
      cinemaId,
    );
  }

  async getPoolCount(
    user: any,
    selectedCinemaId?:
      number | null,
  ) {
    const cinemaId =
      resolveShiftTradeCinemaId(
        user,
        selectedCinemaId,
      );
    const userId =
      resolveShiftTradeActorUserId(
        user,
      );
    const count =
      await this.prisma.shiftTrade.count({
        where: {
          cinemaId,
          status:
            ShiftTradeStatus.OPEN,
          type:
            ShiftTradeType.POOL,
          offeredByUserId: {
            not: userId,
          },
          shift: {
            startTime: {
              gt: new Date(),
            },
          },
        },
      });

    return {
      count,
    };
  }

  async getDirectCount(
    user: any,
    selectedCinemaId?:
      number | null,
  ) {
    const cinemaId =
      resolveShiftTradeCinemaId(
        user,
        selectedCinemaId,
      );
    const userId =
      resolveShiftTradeActorUserId(
        user,
      );
    const count =
      await this.prisma.shiftTrade.count({
        where: {
          cinemaId,
          status:
            ShiftTradeStatus.OPEN,
          type:
            ShiftTradeType.DIRECT,
          targetUserId:
            userId,
          shift: {
            startTime: {
              gt: new Date(),
            },
          },
        },
      });

    return {
      count,
    };
  }

  async create(
    actor: any,
    data: {
      shiftId: number;
      type?:
        ShiftTradeType;
      targetUserId?:
        number;
      message?: string;
    },
    selectedCinemaId?:
      number | null,
  ) {
    const cinemaId =
      resolveShiftTradeCinemaId(
        actor,
        selectedCinemaId,
      );
    const actorContext =
      await resolveShiftTradeActorContext(
        this.prisma,
        {
          ...actor,
          cinemaId,
        },
      );

    return createShiftTrade(
      {
        prisma:
          this.prisma,
        realtime:
          this.realtime,
        notifications:
          this.notifications,
        push:
          this.push,
      },
      {
        ...data,
        offeredByUserId:
          actorContext.userId,
        cinemaId:
          actorContext.cinemaId,
      },
    );
  }

  acceptTrade(
    id: number,
    actor: any,
  ) {
    return acceptShiftTrade(
      {
        prisma:
          this.prisma,
        realtime:
          this.realtime,
        notifications:
          this.notifications,
        push:
          this.push,
      },
      id,
      actor,
    );
  }

  rejectTrade(
    id: number,
    actor: any,
  ) {
    return rejectShiftTrade(
      {
        prisma:
          this.prisma,
        realtime:
          this.realtime,
        notifications:
          this.notifications,
        push:
          this.push,
      },
      id,
      actor,
    );
  }

  cancelTrade(
    id: number,
    actor: any,
  ) {
    return cancelShiftTrade(
      {
        prisma:
          this.prisma,
        realtime:
          this.realtime,
      },
      id,
      actor,
    );
  }
}
