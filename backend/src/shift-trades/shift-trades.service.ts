import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
        acceptedByUser: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  create(data: {
    shiftId: number;
    offeredByUserId: number;
    cinemaId: number;
    message?: string;
  }) {
    return this.prisma.shiftTrade.create({
      data: {
        shiftId: data.shiftId,
        offeredByUserId: data.offeredByUserId,
        cinemaId: data.cinemaId,
        message: data.message,
      },
    });
  }

  async acceptTrade(id: number, acceptedByUserId: number) {
    const trade = await this.prisma.shiftTrade.findUnique({
      where: { id },
      include: {
        shift: true,
      },
    });

    if (!trade) {
      throw new Error('Vagtbytte blev ikke fundet');
    }

    await this.prisma.shift.update({
      where: { id: trade.shiftId },
      data: {
        userId: acceptedByUserId,
      },
    });

    return this.prisma.shiftTrade.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        acceptedByUserId,
      },
    });
  }

  cancelTrade(id: number) {
    return this.prisma.shiftTrade.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });
  }
}