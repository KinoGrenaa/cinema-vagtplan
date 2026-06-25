import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { PushService } from '../push/push.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  AuthUser,
  ShiftWriteData,
  formatShiftTime as formatShiftTimeHelper,
  getCopenhagenDayRange,
  getShiftCinemaFilter,
  getShiftUserLabel,
  resolveShiftCinemaId,
  validateShiftTimes,
} from './helpers/shift-service-helpers';

@Injectable()
export class ShiftsService {
  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
    private pushService: PushService,
    private auditLogsService: AuditLogsService,
  ) {}

  async findAll(
    user: AuthUser,
    date?: string,
    selectedCinemaId?: number | null,
  ) {
    const where: any = {
      ...getShiftCinemaFilter(user, selectedCinemaId),
    };

    if (date) {
      const { start, end } = getCopenhagenDayRange(date);

      where.AND = [
        {
          startTime: {
            lt: end,
          },
        },
        {
          endTime: {
            gt: start,
          },
        },
      ];
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
    return formatShiftTimeHelper(startTime, endTime);
  }

  async checkConflicts(data: {
    startTime: Date;
    endTime: Date;
    userId: number;
    cinemaId: number;
    ignoreShiftId?: number;
  }) {
    validateShiftTimes(data.startTime, data.endTime);

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
          lt: data.endTime,
        },
        endDate: {
          gt: data.startTime,
        },
      },
    });

    if (leaveRequest) {
      throw new BadRequestException(
        'Medarbejderen har godkendt fri i dette tidsrum',
      );
    }
  }

  async createShift(user: AuthUser, data: ShiftWriteData) {
    const cinemaId = resolveShiftCinemaId(user, data.cinemaId);
    const assignedUserId = data.userId ?? null;

    const workType = await this.prisma.workType.findFirst({
      where: {
        id: data.workTypeId,
        cinemaId,
      },
    });

    if (!workType) {
      throw new ForbiddenException('Vagttypen findes ikke i denne biograf');
    }

    if (assignedUserId) {
      const shiftUser = await this.prisma.user.findFirst({
        where: {
          id: assignedUserId,
          cinemaId,
        },
      });

      if (!shiftUser) {
        throw new ForbiddenException('Medarbejderen findes ikke i denne biograf');
      }
    }

    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    validateShiftTimes(startTime, endTime);

    if (assignedUserId) {
      await this.checkConflicts({
        startTime,
        endTime,
        userId: assignedUserId,
        cinemaId,
      });
    }

    const shift = await this.prisma.shift.create({
      data: {
        startTime,
        endTime,
        note: data.note,
        cinemaId,
        userId: assignedUserId,
        workTypeId: data.workTypeId,
      },
      include: {
        workType: true,
        user: true,
      },
    });

    await this.auditLogsService.create({
      action: 'CREATE_SHIFT',
      entityType: 'Shift',
      entityId: shift.id,
      description: `Oprettede vagt til ${getShiftUserLabel(shift)}: ${
        shift.workType.name
      } - ${this.formatShiftTime(shift.startTime, shift.endTime)}`,
      userId: user.sub,
      cinemaId: shift.cinemaId,
    });

    this.realtimeGateway.notifyCinema(shift.cinemaId, 'shiftsUpdated', shift);

    if (assignedUserId) {
      await this.pushService.sendToUser(assignedUserId, {
        title: 'Ny vagt',
        body: `${shift.workType.name} - ${this.formatShiftTime(startTime, endTime)}`,
        url: '/my-shifts',
      });
    }

    return shift;
  }

  async updateShift(user: AuthUser, id: number, data: ShiftWriteData) {
    const oldShift = await this.prisma.shift.findFirst({
      where: {
        id,
        ...getShiftCinemaFilter(user, data.cinemaId),
      },
      include: {
        user: true,
        workType: true,
      },
    });

    if (!oldShift) {
      throw new NotFoundException('Vagten blev ikke fundet');
    }

    const cinemaId = oldShift.cinemaId;
    const assignedUserId = data.userId ?? null;

    const workType = await this.prisma.workType.findFirst({
      where: {
        id: data.workTypeId,
        cinemaId,
      },
    });

    if (!workType) {
      throw new ForbiddenException('Vagttypen findes ikke i denne biograf');
    }

    if (assignedUserId) {
      const shiftUser = await this.prisma.user.findFirst({
        where: {
          id: assignedUserId,
          cinemaId,
        },
      });

      if (!shiftUser) {
        throw new ForbiddenException('Medarbejderen findes ikke i denne biograf');
      }
    }

    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    validateShiftTimes(startTime, endTime);

    if (assignedUserId) {
      await this.checkConflicts({
        startTime,
        endTime,
        userId: assignedUserId,
        cinemaId,
        ignoreShiftId: id,
      });
    }

    const shift = await this.prisma.shift.update({
      where: {
        id,
      },
      data: {
        startTime,
        endTime,
        note: data.note,
        userId: assignedUserId,
        workTypeId: data.workTypeId,
      },
      include: {
        workType: true,
        user: true,
      },
    });

    await this.auditLogsService.create({
      action: 'UPDATE_SHIFT',
      entityType: 'Shift',
      entityId: shift.id,
      description: `Opdaterede vagt fra ${oldShift.workType.name} - ${this.formatShiftTime(
        oldShift.startTime,
        oldShift.endTime,
      )} til ${getShiftUserLabel(shift)}: ${
        shift.workType.name
      } - ${this.formatShiftTime(shift.startTime, shift.endTime)}`,
      userId: user.sub,
      cinemaId: shift.cinemaId,
    });

    this.realtimeGateway.notifyCinema(shift.cinemaId, 'shiftsUpdated', shift);

    if (assignedUserId) {
      await this.pushService.sendToUser(assignedUserId, {
        title: oldShift.userId === assignedUserId ? 'Vagt ændret' : 'Vagt tildelt',
        body: `${shift.workType.name} - ${this.formatShiftTime(startTime, endTime)}`,
        url: '/my-shifts',
      });
    }

    if (oldShift.userId && oldShift.userId !== assignedUserId) {
      await this.pushService.sendToUser(oldShift.userId, {
        title: assignedUserId ? 'Vagt fjernet' : 'Vagt ikke længere tildelt',
        body: assignedUserId
          ? 'En vagt er blevet flyttet til en anden medarbejder.'
          : 'En vagt er blevet fjernet fra din vagtplan.',
        url: '/my-shifts',
      });
    }

    return shift;
  }

  async deleteShift(
    user: AuthUser,
    id: number,
    selectedCinemaId?: number | null,
  ) {
    const shiftToDelete = await this.prisma.shift.findFirst({
      where: {
        id,
        ...getShiftCinemaFilter(user, selectedCinemaId),
      },
      include: {
        workType: true,
        user: true,
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

    await this.auditLogsService.create({
      action: 'DELETE_SHIFT',
      entityType: 'Shift',
      entityId: shiftToDelete.id,
      description: `Slettede vagt for ${getShiftUserLabel(
        shiftToDelete,
      )}: ${shiftToDelete.workType.name} - ${this.formatShiftTime(
        shiftToDelete.startTime,
        shiftToDelete.endTime,
      )}`,
      userId: user.sub,
      cinemaId: shiftToDelete.cinemaId,
    });

    this.realtimeGateway.notifyCinema(shift.cinemaId, 'shiftsUpdated', shift);

    if (shiftToDelete.userId) {
      await this.pushService.sendToUser(shiftToDelete.userId, {
        title: 'Vagt slettet',
        body: `${shiftToDelete.workType.name} - ${this.formatShiftTime(
          shiftToDelete.startTime,
          shiftToDelete.endTime,
        )}`,
        url: '/my-shifts',
      });
    }

    return shift;
  }
}
