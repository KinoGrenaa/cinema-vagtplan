import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShiftTradeStatus, ShiftTradeType } from '@prisma/client';

@Injectable()
export class ShiftTradesService {
  constructor(private prisma: PrismaService) {}

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

  async create(data: {
    shiftId: number;
    offeredByUserId: number;
    cinemaId: number;
    type?: ShiftTradeType;
    targetUserId?: number;
    message?: string;
  }) {
    return this.prisma.shiftTrade.create({
      data: {
        shiftId: data.shiftId,
        offeredByUserId: data.offeredByUserId,
        cinemaId: data.cinemaId,
        type: data.type ?? ShiftTradeType.POOL,
        targetUserId: data.targetUserId ?? null,
        message: data.message ?? null,
      },
    });
  }

  async acceptTrade(id: number, acceptedByUserId: number) {
    const trade = await this.prisma.shiftTrade.findUnique({
      where: { id },
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
    });

    await this.prisma.shift.update({
      where: {
        id: trade.shiftId,
      },
      data: {
        userId: acceptedByUserId,
      },
    });

    return updatedTrade;
  }

  async rejectTrade(id: number) {
    return this.prisma.shiftTrade.update({
      where: { id },
      data: {
        status: ShiftTradeStatus.REJECTED,
      },
    });
  }

  async cancelTrade(id: number) {
    return this.prisma.shiftTrade.update({
      where: { id },
      data: {
        status: ShiftTradeStatus.CANCELLED,
      },
    });
  }
}