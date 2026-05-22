import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { PushService } from '../push/push.service';

type AuthUser = {
  sub: number;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number;
};

@Injectable()
export class ShiftsService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
    private pushService: PushService,
  ) {}

  private getCinemaFilter(user: AuthUser) {
    if (user.role === 'MASTER') return {};
    return { cinemaId: user.cinemaId };
  }

  async findAll(user: AuthUser, date?: string) {
    const where: any = {
      ...this.getCinemaFilter(user),
    };

    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(`${date}T23:59:59.999Z`);

      where.startTime = {
        gte: start,
        lte: end,
      };
    }

    return this.prisma.shift.findMany({
      where,
      include: {
        user: true,
        workType: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  formatShiftTime(startTime: Date, endTime: Date) {
    const date = startTime.toLocaleDateString('da-DK');
    const start = startTime.toLocaleTimeString('da-DK', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const end = endTime.toLocaleTimeString('da-DK', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `${date} kl. ${start}-${end}`;
  }

  async checkConflicts(data: {
    startTime: Date;
    endTime: Date;
    userId: number;
    cinemaId: number;
    ignoreShiftId?: number;
  }) {
    if (data.endTime <= data.startTime) {
      throw new BadRequestException(
        'Sluttidspunkt skal være efter starttidspunkt',
      );
    }

    const overlappingShift = await this.prisma.shift.findFirst({
      where: {
        cinemaId: data.cinemaId,
        userId: data.userId,
        id: data.ignoreShiftId
          ? {
              not: data.ignoreShiftId,
            }
          : undefined,
        startTime: {
          lt: data.endTime,
        },
        endTime: {
          gt: data.startTime,
        },
      },
    });

    if (overlappingShift) {
      throw new BadRequestException(
        'Medarbejderen har allerede en vagt i dette tidsrum',
      );
    }

    const leaveRequest = await this.prisma.leaveRequest.findFirst({
      where: {
        cinemaId: data.cinemaId,
        userId: data.userId,
        status: 'APPROVED',
        startDate: {
          lte: data.endTime,
        },
        endDate: {
          gte: data.startTime,
        },
      },
    });

    if (leaveRequest) {
      throw new BadRequestException(
        'Medarbejderen har godkendt fri i dette tidsrum',
      );
    }
  }

  async createShift(
    user: AuthUser,
    data: {
      startTime: string;
      endTime: string;
      note?: string;
      cinemaId?: number;
      userId: number;
      workTypeId: number;
    },
  ) {
    const cinemaId = user.role === 'MASTER' ? data.cinemaId : user.cinemaId;

    if (!cinemaId) {
      throw new BadRequestException('CinemaId mangler');
    }

    const shiftUser = await this.prisma.user.findFirst({
      where: {
        id: data.userId,
        cinemaId,
      },
    });

    if (!shiftUser) {
      throw new ForbiddenException('Medarbejderen findes ikke i denne biograf');
    }

    const workType = await this.prisma.workType.findFirst({
      where: {
        id: data.workTypeId,
        cinemaId,
      },
    });

    if (!workType) {
      throw new ForbiddenException('Vagttypen findes ikke i denne biograf');
    }

    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    await this.checkConflicts({
      startTime,
      endTime,
      userId: data.userId,
      cinemaId,
    });

    const shift = await this.prisma.shift.create({
      data: {
        startTime,
        endTime,
        note: data.note,
        cinemaId,
        userId: data.userId,
        workTypeId: data.workTypeId,
      },
      include: {
        workType: true,
        user: true,
      },
    });

    this.realtime.notifyCinema(shift.cinemaId, 'shiftsUpdated', shift);

    await this.pushService.sendToUser(data.userId, {
      title: 'Ny vagt',
      body: `${shift.workType.name} - ${this.formatShiftTime(startTime, endTime)}`,
      url: '/my-shifts',
    });

    return shift;
  }

  async updateShift(
    user: AuthUser,
    id: number,
    data: {
      startTime: string;
      endTime: string;
      note?: string | null;
      userId: number;
      workTypeId: number;
    },
  ) {
    const oldShift = await this.prisma.shift.findFirst({
      where: {
        id,
        ...this.getCinemaFilter(user),
      },
    });

    if (!oldShift) {
      throw new NotFoundException('Vagten blev ikke fundet');
    }

    const cinemaId = oldShift.cinemaId;

    const shiftUser = await this.prisma.user.findFirst({
      where: {
        id: data.userId,
        cinemaId,
      },
    });

    if (!shiftUser) {
      throw new ForbiddenException('Medarbejderen findes ikke i denne biograf');
    }

    const workType = await this.prisma.workType.findFirst({
      where: {
        id: data.workTypeId,
        cinemaId,
      },
    });

    if (!workType) {
      throw new ForbiddenException('Vagttypen findes ikke i denne biograf');
    }

    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    await this.checkConflicts({
      startTime,
      endTime,
      userId: data.userId,
      cinemaId,
      ignoreShiftId: id,
    });

    const shift = await this.prisma.shift.update({
      where: {
        id,
      },
      data: {
        startTime,
        endTime,
        note: data.note,
        userId: data.userId,
        workTypeId: data.workTypeId,
      },
      include: {
        workType: true,
        user: true,
      },
    });

    this.realtime.notifyCinema(shift.cinemaId, 'shiftsUpdated', shift);

    await this.pushService.sendToUser(data.userId, {
      title: 'Vagt ændret',
      body: `${shift.workType.name} - ${this.formatShiftTime(startTime, endTime)}`,
      url: '/my-shifts',
    });

    if (oldShift.userId !== data.userId) {
      await this.pushService.sendToUser(oldShift.userId, {
        title: 'Vagt fjernet',
        body: 'En vagt er blevet flyttet til en anden medarbejder.',
        url: '/my-shifts',
      });
    }

    return shift;
  }

  async deleteShift(user: AuthUser, id: number) {
    const shiftToDelete = await this.prisma.shift.findFirst({
      where: {
        id,
        ...this.getCinemaFilter(user),
      },
      include: {
        workType: true,
      },
    });

    if (!shiftToDelete) {
      throw new NotFoundException('Vagten blev ikke fundet');
    }

    const shift = await this.prisma.shift.delete({
      where: {
        id,
      },
    });

    this.realtime.notifyCinema(shift.cinemaId, 'shiftsUpdated', shift);

    await this.pushService.sendToUser(shiftToDelete.userId, {
      title: 'Vagt slettet',
      body: `${shiftToDelete.workType.name} - ${this.formatShiftTime(
        shiftToDelete.startTime,
        shiftToDelete.endTime,
      )}`,
      url: '/my-shifts',
    });

    return shift;
  }
}
