import { Injectable } from '@nestjs/common';
import { ShiftTradeStatus, ShiftTradeType } from '@prisma/client';

import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import {
  getShiftTradeCinemaFilter,
  resolveShiftTradeCinemaId,
  shiftTradeInclude,
} from './helpers/shift-trade-service-helpers';
import { acceptShiftTrade } from './helpers/shift-trade-accept-flow';
import { cancelShiftTrade } from './helpers/shift-trade-cancel-flow';
import { createShiftTrade } from './helpers/shift-trade-create-flow';
import { rejectShiftTrade } from './helpers/shift-trade-reject-flow';

@Injectable()
export class ShiftTradesService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
    private notifications: NotificationsService,
    private push: PushService,
  ) {}

  findAll(user: any, selectedCinemaId?: number | null) {
    return this.prisma.shiftTrade.findMany({
      where: getShiftTradeCinemaFilter(user, selectedCinemaId),
      include: shiftTradeInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getPoolCount(
    user: any,
    userId: number,
    selectedCinemaId?: number | null,
  ) {
    const cinemaId = resolveShiftTradeCinemaId(user, selectedCinemaId);
    const count = await this.prisma.shiftTrade.count({
      where: {
        cinemaId,
        status: ShiftTradeStatus.OPEN,
        type: ShiftTradeType.POOL,
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

    return { count };
  }

  async getDirectCount(
    user: any,
    userId: number,
    selectedCinemaId?: number | null,
  ) {
    const cinemaId = resolveShiftTradeCinemaId(user, selectedCinemaId);
    const count = await this.prisma.shiftTrade.count({
      where: {
        cinemaId,
        status: ShiftTradeStatus.OPEN,
        type: ShiftTradeType.DIRECT,
        targetUserId: userId,
        shift: {
          startTime: {
            gt: new Date(),
          },
        },
      },
    });

    return { count };
  }

  create(data: {
    shiftId: number;
    offeredByUserId: number;
    cinemaId: number;
    type?: ShiftTradeType;
    targetUserId?: number;
    message?: string;
  }) {
    return createShiftTrade(
      {
        prisma: this.prisma,
        realtime: this.realtime,
        notifications: this.notifications,
        push: this.push,
      },
      data,
    );
  }

  acceptTrade(id: number, acceptedByUserId: number) {
    return acceptShiftTrade(
      {
        prisma: this.prisma,
        realtime: this.realtime,
        notifications: this.notifications,
        push: this.push,
      },
      id,
      acceptedByUserId,
    );
  }

  rejectTrade(id: number, rejectedByUserId: number) {
    return rejectShiftTrade(
      {
        prisma: this.prisma,
        realtime: this.realtime,
        notifications: this.notifications,
        push: this.push,
      },
      id,
      rejectedByUserId,
    );
  }

  cancelTrade(id: number, userId?: number) {
    return cancelShiftTrade(
      {
        prisma: this.prisma,
        realtime: this.realtime,
      },
      id,
      userId,
    );
  }
}
