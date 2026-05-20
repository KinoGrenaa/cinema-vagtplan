import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ShiftTradeType } from '@prisma/client';
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
        targetUser: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private async hasShiftConflict(userId: number, shiftId: number) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new NotFoundException('Vagten blev ikke fundet');
    }

    const conflict = await this.prisma.shift.findFirst({
      where: {
        userId,
        id: {
          not: shiftId,
        },
        startTime: {
          lt: shift.endTime,
        },
        endTime: {
          gt: shift.startTime,
        },
      },
    });

    return Boolean(conflict);
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
      where: { id: data.cinemaId },
    });

    if (!cinema) {
      throw new NotFoundException('Biograf blev ikke fundet');
    }

    const type = data.type ?? ShiftTradeType.POOL;

    if (type === ShiftTradeType.POOL && !cinema.allowShiftTradePool) {
      throw new BadRequestException('Vagtpulje er ikke aktiveret');
    }

    if (type === ShiftTradeType.DIRECT && !cinema.allowShiftTradeDirect) {
      throw new BadRequestException('Direkte vagtbytte er ikke aktiveret');
    }

    if (type === ShiftTradeType.DIRECT && !data.targetUserId) {
      throw new BadRequestException('Der skal vælges en kollega');
    }

    const shift = await this.prisma.shift.findUnique({
      where: { id: data.shiftId },
    });

    if (!shift) {
      throw new NotFoundException('Vagten blev ikke fundet');
    }

    if (shift.startTime <= new Date()) {
      throw new BadRequestException(
        'Du kan ikke sende en vagt til bytte, når vagten allerede er startet eller ligger i fortiden',
      );
    }

    if (shift.userId !== data.offeredByUserId) {
      throw new BadRequestException('Du kan kun sende dine egne vagter');
    }

    const existingOpenTrade = await this.prisma.shiftTrade.findFirst({
      where: {
        shiftId: data.shiftId,
        status: 'OPEN',
      },
    });

    if (existingOpenTrade) {
      throw new BadRequestException(
        'Denne vagt er allerede sendt til vagtbytte',
      );
    }

    return this.prisma.shiftTrade.create({
      data: {
        shiftId: data.shiftId,
        offeredByUserId: data.offeredByUserId,
        cinemaId: data.cinemaId,
        type,
        targetUserId: data.targetUserId,
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
      throw new NotFoundException('Vagtbytte blev ikke fundet');
    }

    if (trade.shift.startTime <= new Date()) {
      throw new BadRequestException(
        'Du kan ikke acceptere en vagt, der allerede er startet eller ligger i fortiden',
      );
    }

    if (trade.status !== 'OPEN') {
      throw new BadRequestException('Vagtbyttet er ikke åbent');
    }

    if (
      trade.type === ShiftTradeType.DIRECT &&
      trade.targetUserId !== acceptedByUserId
    ) {
      throw new BadRequestException(
        'Denne vagt er sendt til en anden medarbejder',
      );
    }

    if (trade.offeredByUserId === acceptedByUserId) {
      throw new BadRequestException('Du kan ikke acceptere din egen vagt');
    }

    const hasConflict = await this.hasShiftConflict(
      acceptedByUserId,
      trade.shiftId,
    );

    if (hasConflict) {
      throw new BadRequestException('Du har allerede vagt i dette tidsrum');
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

  rejectTrade(id: number) {
    return this.prisma.shiftTrade.update({
      where: { id },
      data: {
        status: 'REJECTED',
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