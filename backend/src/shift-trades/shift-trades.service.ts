import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { ShiftTradeStatus, ShiftTradeType } from '@prisma/client';

@Injectable()
export class ShiftTradesService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getPoolCount(cinemaId: number) {
    const count = await this.prisma.shiftTrade.count({
      where: {
        cinemaId,
        status: ShiftTradeStatus.OPEN,
        type: ShiftTradeType.POOL,
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
      },
    });

    this.realtime.notifyAll('shiftTradesUpdated', trade);

    return trade;
  }

  async acceptTrade(id: number, acceptedByUserId: number) {
    const trade = await this.prisma.shiftTrade.findUnique({
      where: { id },
      include: {
        shift: true,
      },
    });

    if (!trade) {
      throw new NotFoundException('Vagtbytte blev ikke fundet');
    }

    const updatedTrade = await this.prisma.shiftTrade.update({
      where: { id },
      data: {
        status: ShiftTradeStatus.ACCEPTED,
        acceptedByUserId,
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

    this.realtime.notifyAll('shiftTradesUpdated', updatedTrade);
    this.realtime.notifyAll('shiftsUpdated', updatedTrade.shift);

    return updatedTrade;
  }

  async rejectTrade(id: number) {
    const trade = await this.prisma.shiftTrade.update({
      where: { id },
      data: {
        status: ShiftTradeStatus.REJECTED,
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
      },
    });

    this.realtime.notifyAll('shiftTradesUpdated', trade);

    return trade;
  }

  async cancelTrade(id: number) {
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
      },
    });

    this.realtime.notifyAll('shiftTradesUpdated', trade);

    return trade;
  }
}