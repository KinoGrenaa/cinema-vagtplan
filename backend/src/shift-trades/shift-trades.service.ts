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

  private formatShiftInfo(shift: {
    startTime: Date;
    endTime: Date;
    workType?: { name: string } | null;
  }) {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);

    return `${shift.workType?.name ?? 'Vagt'} ${start.toLocaleDateString(
      'da-DK',
    )} kl. ${start.toLocaleTimeString('da-DK', {
      hour: '2-digit',
      minute: '2-digit',
    })} - ${end.toLocaleTimeString('da-DK', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  private async createMessage(data: {
    cinemaId: number;
    senderId: number;
    receiverId?: number | null;
    subject: string;
    body: string;
    isBroadcast?: boolean;
  }) {
    return this.prisma.message.create({
      data: {
        cinemaId: data.cinemaId,
        senderId: data.senderId,
        receiverId: data.receiverId ?? null,
        subject: data.subject,
        body: data.body,
        isBroadcast: data.isBroadcast ?? false,
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
      include: {
        workType: true,
      },
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

    const trade = await this.prisma.shiftTrade.create({
      data: {
        shiftId: data.shiftId,
        offeredByUserId: data.offeredByUserId,
        cinemaId: data.cinemaId,
        type,
        targetUserId: data.targetUserId,
        message: data.message,
      },
    });

    if (type === ShiftTradeType.DIRECT && data.targetUserId) {
      await this.createMessage({
        cinemaId: data.cinemaId,
        senderId: data.offeredByUserId,
        receiverId: data.targetUserId,
        subject: 'Du har fået tilbudt en vagt',
        body: `Du har fået tilbudt vagten: ${this.formatShiftInfo(shift)}.`,
      });
    }

    if (type === ShiftTradeType.POOL) {
      await this.createMessage({
        cinemaId: data.cinemaId,
        senderId: data.offeredByUserId,
        subject: 'Ny vagt i fælles pulje',
        body: `Der er lagt en ny vagt i fælles pulje: ${this.formatShiftInfo(
          shift,
        )}.`,
        isBroadcast: true,
      });
    }

    return trade;
  }

  async acceptTrade(id: number, acceptedByUserId: number) {
    const trade = await this.prisma.shiftTrade.findUnique({
      where: { id },
      include: {
        shift: {
          include: {
            workType: true,
          },
        },
        offeredByUser: true,
        acceptedByUser: true,
        targetUser: true,
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

    const updatedTrade = await this.prisma.shiftTrade.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        acceptedByUserId,
      },
    });

    const acceptingUser = await this.prisma.user.findUnique({
      where: { id: acceptedByUserId },
    });

    await this.createMessage({
      cinemaId: trade.cinemaId,
      senderId: acceptedByUserId,
      receiverId: trade.offeredByUserId,
      subject: 'Din vagt er blevet accepteret',
      body: `${
        acceptingUser
          ? `${acceptingUser.firstName} ${acceptingUser.lastName}`
          : 'En kollega'
      } har accepteret vagten: ${this.formatShiftInfo(trade.shift)}.`,
    });

    return updatedTrade;
  }

  async rejectTrade(id: number) {
    const trade = await this.prisma.shiftTrade.findUnique({
      where: { id },
      include: {
        shift: {
          include: {
            workType: true,
          },
        },
        targetUser: true,
      },
    });

    if (!trade) {
      throw new NotFoundException('Vagtbytte blev ikke fundet');
    }

    const updatedTrade = await this.prisma.shiftTrade.update({
      where: { id },
      data: {
        status: 'REJECTED',
      },
    });

    if (trade.targetUserId) {
      await this.createMessage({
        cinemaId: trade.cinemaId,
        senderId: trade.targetUserId,
        receiverId: trade.offeredByUserId,
        subject: 'Dit vagt-tilbud blev afvist',
        body: `${
          trade.targetUser
            ? `${trade.targetUser.firstName} ${trade.targetUser.lastName}`
            : 'Kollegaen'
        } har afvist vagten: ${this.formatShiftInfo(trade.shift)}.`,
      });
    }

    return updatedTrade;
  }

  async cancelTrade(id: number) {
    const trade = await this.prisma.shiftTrade.findUnique({
      where: { id },
      include: {
        shift: {
          include: {
            workType: true,
          },
        },
        targetUser: true,
      },
    });

    if (!trade) {
      throw new NotFoundException('Vagtbytte blev ikke fundet');
    }

    const updatedTrade = await this.prisma.shiftTrade.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });

    if (trade.type === ShiftTradeType.DIRECT && trade.targetUserId) {
      await this.createMessage({
        cinemaId: trade.cinemaId,
        senderId: trade.offeredByUserId,
        receiverId: trade.targetUserId,
        subject: 'Vagt-tilbud annulleret',
        body: `Vagten er blevet annulleret: ${this.formatShiftInfo(
          trade.shift,
        )}.`,
      });
    }

    return updatedTrade;
  }
}