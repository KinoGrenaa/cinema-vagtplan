import { Injectable } from '@nestjs/common';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { checkShiftConflicts } from './helpers/shift-conflict-checks';
import { createShiftFlow } from './helpers/shift-create-flow';
import { deleteShiftFlow } from './helpers/shift-delete-flow';
import {
  AuthUser,
  ShiftWriteData,
  formatShiftTime as formatShiftTimeHelper,
  getCopenhagenDayRange,
  resolveShiftCinemaId,
} from './helpers/shift-service-helpers';
import { updateShiftFlow } from './helpers/shift-update-flow';
import { ensureShiftActorHasCinemaAccess } from './helpers/shift-user-access';

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
    const cinemaId = resolveShiftCinemaId(
      user,
      selectedCinemaId,
    );

    await ensureShiftActorHasCinemaAccess(
      this.prisma,
      user,
      cinemaId,
    );

    const where: any = {
      cinemaId,
    };

    if (date) {
      const { start, end } =
        getCopenhagenDayRange(date);

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

  formatShiftTime(
    startTime: Date,
    endTime: Date,
  ) {
    return formatShiftTimeHelper(
      startTime,
      endTime,
    );
  }

  async checkConflicts(data: {
    startTime: Date;
    endTime: Date;
    userId: number;
    cinemaId: number;
    ignoreShiftId?: number;
  }) {
    return checkShiftConflicts(
      this.prisma,
      data,
    );
  }

  async createShift(
    user: AuthUser,
    data: ShiftWriteData,
  ) {
    const cinemaId = resolveShiftCinemaId(
      user,
      data.cinemaId,
    );

    await ensureShiftActorHasCinemaAccess(
      this.prisma,
      user,
      cinemaId,
    );

    return createShiftFlow({
      prisma: this.prisma,
      realtimeGateway: this.realtimeGateway,
      pushService: this.pushService,
      auditLogsService: this.auditLogsService,
      formatShiftTime: (
        startTime,
        endTime,
      ) =>
        this.formatShiftTime(
          startTime,
          endTime,
        ),
      user,
      data,
    });
  }

  async updateShift(
    user: AuthUser,
    id: number,
    data: ShiftWriteData,
  ) {
    const cinemaId = resolveShiftCinemaId(
      user,
      data.cinemaId,
    );

    await ensureShiftActorHasCinemaAccess(
      this.prisma,
      user,
      cinemaId,
    );

    return updateShiftFlow({
      prisma: this.prisma,
      realtimeGateway: this.realtimeGateway,
      pushService: this.pushService,
      auditLogsService: this.auditLogsService,
      formatShiftTime: (
        startTime,
        endTime,
      ) =>
        this.formatShiftTime(
          startTime,
          endTime,
        ),
      user,
      id,
      data,
    });
  }

  async deleteShift(
    user: AuthUser,
    id: number,
    selectedCinemaId?: number | null,
  ) {
    const cinemaId = resolveShiftCinemaId(
      user,
      selectedCinemaId,
    );

    await ensureShiftActorHasCinemaAccess(
      this.prisma,
      user,
      cinemaId,
    );

    return deleteShiftFlow({
      prisma: this.prisma,
      realtimeGateway: this.realtimeGateway,
      pushService: this.pushService,
      auditLogsService: this.auditLogsService,
      formatShiftTime: (
        startTime,
        endTime,
      ) =>
        this.formatShiftTime(
          startTime,
          endTime,
        ),
      user,
      id,
      selectedCinemaId,
    });
  }
}
