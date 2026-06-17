import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  private getCinemaFilter(user: any) {
    if (user?.role === 'MASTER') {
      return {};
    }

    return {
      cinemaId: user.cinemaId,
    };
  }

  findAll(user?: any) {
    return this.prisma.shiftTrade.findMany({
      where: user ? this.getCinemaFilter(user) : {},
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
      throw new ForbiddenException(
        'Vagtpulje er deaktiveret for denne biograf',
      );
    }

    if (data.type === ShiftTradeType.DIRECT && !cinema.allowShiftTradeDirect) {
      throw new ForbiddenException(
        'Direkte vagtbytte er deaktiveret for denne biograf',
      );
    }

    const shift = await this.prisma.shift.findFirst({
      where: {
        id: data.shiftId,
        cinemaId: data.cinemaId,
      },
    });

    if (!shift) {
      throw new NotFoundException('Vagten blev ikke fundet i denne biograf');
    }

    if (shift.userId !== data.offeredByUserId) {
      throw new ForbiddenException('Du kan kun bytte dine egne vagter');
    }

    if (data.targetUserId) {
      const targetUser = await this.prisma.user.findFirst({
        where: {
          id: data.targetUserId,
          cinemaId: data.cinemaId,
        },
      });

      if (!targetUser) {
        throw new ForbiddenException('Modtageren findes ikke i denne biograf');
      }
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

    this.realtime.notifyCinema(trade.cinemaId, 'shiftTradesUpdated', trade);

    if (trade.type === ShiftTradeType.DIRECT) {
      this.realtime.notifyCinema(trade.cinemaId, 'newDirectShiftTrade', trade);

      if (trade.targetUserId) {
        await this.notifications.create({
          userId: trade.targetUserId,
          cinemaId: trade.cinemaId,
          title: 'Ny direkte vagt',
          message: 'Du har fÃ¥et tilbudt en vagt direkte',
          type: 'SHIFT_DIRECT',
          linkUrl: '/my-shifts',
        });

        await this.push.sendToUser(trade.targetUserId, {
          title: 'Ny direkte vagt',
          body: 'Du har fÃ¥et tilbudt en vagt direkte',
          url: '/my-shifts',
        });
      }
    }

    return trade;
  }

  async acceptTrade(id: number, acceptedByUserId: number) {
    const acceptedByUser = await this.prisma.user.findUnique({
      where: {
        id: acceptedByUserId,
      },
    });

    if (!acceptedByUser) {
      throw new NotFoundException('Bruger blev ikke fundet');
    }

    const acceptedByUserCinemaId = acceptedByUser.cinemaId;

    if (acceptedByUserCinemaId === null) {
      throw new ForbiddenException(
        'Brugeren er ikke tilknyttet en biograf og kan ikke acceptere vagtbytter',
      );
    }

    const trade = await this.prisma.shiftTrade.findFirst({
      where: {
        id,
        cinemaId: acceptedByUserCinemaId,
      },
    });

    if (!trade) {
      throw new NotFoundException('Vagtbytte blev ikke fundet');
    }

    if (trade.status !== ShiftTradeStatus.OPEN) {
      throw new ForbiddenException('Vagtbyttet er ikke lÃ¦ngere Ã¥bent');
    }

    if (trade.offeredByUserId === acceptedByUserId) {
      throw new ForbiddenException('Du kan ikke acceptere din egen vagt');
    }

    if (
      trade.type === ShiftTradeType.DIRECT &&
      trade.targetUserId !== acceptedByUserId
    ) {
      throw new ForbiddenException('Denne vagt er ikke sendt til dig');
    }

    await this.prisma.shiftTrade.update({
      where: { id },
      data: {
        status: ShiftTradeStatus.ACCEPTED,
        acceptedByUserId,
      },
    });

    const shift = await this.prisma.shift.findUnique({
      where: {
        id: trade.shiftId,
      },
    });

    if (!shift) {
      throw new NotFoundException('Vagten blev ikke fundet');
    }

    const conflictingShift = await this.prisma.shift.findFirst({
      where: {
        cinemaId: trade.cinemaId,
        userId: acceptedByUserId,
        id: {
          not: trade.shiftId,
        },
        startTime: {
          lt: shift.endTime,
        },
        endTime: {
          gt: shift.startTime,
        },
      },
    });

    if (conflictingShift) {
      throw new ForbiddenException('Du har allerede en vagt i dette tidsrum');
    }

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
    if (updatedTrade) {
      if (updatedTrade) {
        this.realtime.notifyCinema(
          updatedTrade.cinemaId,
          'shiftAccepted',
          updatedTrade,
        );
      }
    }

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

    this.realtime.notifyCinema(trade.cinemaId, 'shiftsUpdated', {
      shiftId: trade.shiftId,
      acceptedByUserId,
    });

    return updatedTrade;
  }

  async rejectTrade(id: number, rejectedByUserId: number) {
    const rejectedByUser = await this.prisma.user.findUnique({
      where: {
        id: rejectedByUserId,
      },
    });

    if (!rejectedByUser) {
      throw new NotFoundException('Bruger blev ikke fundet');
    }

    const rejectedByUserCinemaId = rejectedByUser.cinemaId;

    if (rejectedByUserCinemaId === null) {
      throw new ForbiddenException(
        'Brugeren er ikke tilknyttet en biograf og kan ikke afvise vagtbytter',
      );
    }

    const existingTrade = await this.prisma.shiftTrade.findFirst({
      where: {
        id,
        cinemaId: rejectedByUserCinemaId,
      },
    });

    if (!existingTrade) {
      throw new NotFoundException('Vagtbytte blev ikke fundet');
    }

    if (existingTrade.status !== ShiftTradeStatus.OPEN) {
      throw new ForbiddenException('Vagtbyttet er ikke lÃ¦ngere Ã¥bent');
    }

    if (
      existingTrade.type === ShiftTradeType.DIRECT &&
      existingTrade.targetUserId !== rejectedByUserId
    ) {
      throw new ForbiddenException('Denne vagt er ikke sendt til dig');
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

    this.realtime.notifyCinema(trade.cinemaId, 'shiftTradesUpdated', trade);
    this.realtime.notifyCinema(trade.cinemaId, 'shiftRejected', trade);

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

  async cancelTrade(id: number, userId?: number) {
    const existingTrade = await this.prisma.shiftTrade.findUnique({
      where: { id },
    });

    if (!existingTrade) {
      throw new NotFoundException('Vagtbytte blev ikke fundet');
    }

    if (userId && existingTrade.offeredByUserId !== userId) {
      throw new ForbiddenException('Du kan kun annullere dine egne vagtbytter');
    }

    if (existingTrade.status !== ShiftTradeStatus.OPEN) {
      throw new ForbiddenException('Vagtbyttet er ikke lÃ¦ngere Ã¥bent');
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

    this.realtime.notifyCinema(trade.cinemaId, 'shiftTradesUpdated', trade);

    return trade;
  }
}

