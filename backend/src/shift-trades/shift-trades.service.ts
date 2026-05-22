import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { ShiftTradeStatus, ShiftTradeType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PushService } from '../push/push.service';

@Injectable()
export class ShiftTradesService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
    private notifications: NotificationsService,
    private push: PushService,
  ) {}

  findAll() {
    return this.prisma.shiftTrade.findMany({
      include: {
        shift: {
          include: {
            user: true,
            workType: true,
          },
        },
        offeredByUser: true,
        targetUser: true,
        acceptedByUser: true,
        rejectedByUser: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getPoolCount(cinemaId: number, userId: number) {
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

  async getDirectCount(cinemaId: number, userId: number) {
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

  async create(data: {
    shiftId: number;
    offeredByUserId: number;
    cinemaId: number;
    type?: ShiftTradeType;
    targetUserId?: number;
    message?: string;
  }) {
    const cinema = await this.prisma.cinema.findUnique({
      where: {
        id: data.cinemaId,
      },
    });

    if (!cinema) {
      throw new NotFoundException('Biograf blev ikke fundet');
    }

    if (data.type === ShiftTradeType.POOL && !cinema.allowShiftTradePool) {
      throw new NotFoundException('Vagtpulje er deaktiveret for denne biograf');
    }

    if (data.type === ShiftTradeType.DIRECT && !cinema.allowShiftTradeDirect) {
      throw new NotFoundException(
        'Direkte vagtbytte er deaktiveret for denne biograf',
      );
    }
    const trade = await this.prisma.shiftTrade.create({
      data: {
        shiftId: data.shiftId,
        offeredByUserId: data.offeredByUserId,
        cinemaId: data.cinemaId,
        type: data.type ?? ShiftTradeType.POOL,
        targetUserId: data.targetUserId ?? null,
        message: data.message ?? null,
      },
      include: {
        shift: {
          include: {
            user: true,
            workType: true,
          },
        },
        offeredByUser: true,
        targetUser: true,
        acceptedByUser: true,
        rejectedByUser: true,
      },
    });

    this.realtime.notifyAll('shiftTradesUpdated', trade);

    if (trade.type === ShiftTradeType.DIRECT) {
      this.realtime.notifyAll('newDirectShiftTrade', trade);

      if (trade.targetUserId) {
        await this.notifications.create({
          userId: trade.targetUserId,
          cinemaId: trade.cinemaId,
          title: 'Ny direkte vagt',
          message: 'Du har fået tilbudt en vagt direkte',
          type: 'SHIFT_DIRECT',
          linkUrl: '/my-shifts',
        });

        await this.push.sendToUser(trade.targetUserId, {
          title: 'Ny direkte vagt',
          body: 'Du har fået tilbudt en vagt direkte',
          url: '/my-shifts',
        });
      }
    }

    if (trade.type === ShiftTradeType.DIRECT) {
      this.realtime.notifyAll('newDirectShiftTrade', trade);
    }

    return trade;
  }

  async acceptTrade(id: number, acceptedByUserId: number) {
    const trade = await this.prisma.shiftTrade.findUnique({
      where: { id },
    });

    if (!trade) {
      throw new NotFoundException('Vagtbytte blev ikke fundet');
    }

    await this.prisma.shiftTrade.update({
      where: { id },
      data: {
        status: ShiftTradeStatus.ACCEPTED,
        acceptedByUserId,
      },
    });

    await this.prisma.shift.update({
      where: {
        id: trade.shiftId,
      },
      data: {
        userId: acceptedByUserId,
      },
    });

    const updatedTrade = await this.prisma.shiftTrade.findUnique({
      where: { id },
      include: {
        shift: {
          include: {
            user: true,
            workType: true,
          },
        },
        offeredByUser: true,
        targetUser: true,
        acceptedByUser: true,
        rejectedByUser: true,
      },
    });

    this.realtime.notifyAll('shiftTradesUpdated', updatedTrade);
    this.realtime.notifyAll('shiftAccepted', updatedTrade);

    if (trade.offeredByUserId !== acceptedByUserId) {
      await this.notifications.create({
        userId: trade.offeredByUserId,
        cinemaId: trade.cinemaId,
        title: 'Vagt accepteret',
        message: 'Din tilbudte vagt blev accepteret',
        type: 'SHIFT_ACCEPTED',
        linkUrl: '/my-shifts',
      });

      await this.push.sendToUser(trade.offeredByUserId, {
        title: 'Vagt accepteret',
        body: 'Din tilbudte vagt blev accepteret',
        url: '/my-shifts',
      });
    }
    this.realtime.notifyAll('shiftsUpdated', {
      shiftId: trade.shiftId,
      acceptedByUserId,
    });

    return updatedTrade;
  }

  async rejectTrade(id: number, rejectedByUserId: number) {
    const existingTrade = await this.prisma.shiftTrade.findUnique({
      where: { id },
    });

    if (!existingTrade) {
      throw new NotFoundException('Vagtbytte blev ikke fundet');
    }

    await this.prisma.shiftTrade.update({
      where: { id },
      data: {
        status: ShiftTradeStatus.REJECTED,
        rejectedByUserId,
      },
    });

    const trade = await this.prisma.shiftTrade.findUnique({
      where: { id },
      include: {
        shift: {
          include: {
            user: true,
            workType: true,
          },
        },
        offeredByUser: true,
        targetUser: true,
        acceptedByUser: true,
        rejectedByUser: true,
      },
    });
    if (!trade) {
      throw new NotFoundException('Vagtbytte blev ikke fundet');
    }
    this.realtime.notifyAll('shiftTradesUpdated', trade);
    this.realtime.notifyAll('shiftRejected', trade);
    if (trade.offeredByUserId !== rejectedByUserId) {
      await this.notifications.create({
        userId: trade.offeredByUserId,
        cinemaId: trade.cinemaId,
        title: 'Vagt afvist',
        message: 'Din tilbudte vagt blev afvist',
        type: 'SHIFT_REJECTED',
        linkUrl: '/my-shifts',
      });
      await this.push.sendToUser(trade.offeredByUserId, {
        title: 'Vagt afvist',
        body: 'Din tilbudte vagt blev afvist',
        url: '/my-shifts',
      });
    }

    return trade;
  }

  async cancelTrade(id: number) {
    const existingTrade = await this.prisma.shiftTrade.findUnique({
      where: { id },
    });

    if (!existingTrade) {
      throw new NotFoundException('Vagtbytte blev ikke fundet');
    }

    const trade = await this.prisma.shiftTrade.update({
      where: { id },
      data: {
        status: ShiftTradeStatus.CANCELLED,
      },
      include: {
        shift: {
          include: {
            user: true,
            workType: true,
          },
        },
        offeredByUser: true,
        targetUser: true,
        acceptedByUser: true,
        rejectedByUser: true,
      },
    });

    this.realtime.notifyAll('shiftTradesUpdated', trade);

    return trade;
  }
}
