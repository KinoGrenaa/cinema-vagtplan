import {
  Injectable,
} from '@nestjs/common';

import {
  AuditLogsService,
} from '../audit-logs/audit-logs.service';
import {
  PrismaService,
} from '../prisma/prisma.service';
import {
  PushService,
} from '../push/push.service';
import {
  RealtimeGateway,
} from '../realtime/realtime.gateway';
import {
  checkShiftConflicts,
} from './helpers/shift-conflict-checks';
import {
  createShiftFlow,
} from './helpers/shift-create-flow';
import {
  deleteShiftFlow,
} from './helpers/shift-delete-flow';
import {
  findScheduleShiftsForDay,
} from './helpers/schedule-shift-read';
import {
  findShiftMonthOverview,
} from './helpers/shift-month-overview-read';
import {
  previewPlanningShiftRemoval as previewPlanningShiftRemovalFlow,
  removePlanningShifts as removePlanningShiftsFlow,
} from './helpers/shift-planning-removal';
import {
  previewPlanningShiftReplacement as previewPlanningShiftReplacementFlow,
  replacePlanningShifts as replacePlanningShiftsFlow,
} from './helpers/shift-planning-replacement';

import {
  AuthUser,
  ShiftWriteData,
  formatShiftTime as formatShiftTimeHelper,
  resolveShiftCinemaId,
} from './helpers/shift-service-helpers';
import {
  updateShiftFlow,
} from './helpers/shift-update-flow';
import {
  ensureShiftActorHasCinemaAccess,
} from './helpers/shift-user-access';

@Injectable()
export class ShiftsService {
  constructor(
    private prisma:
      PrismaService,
    private realtimeGateway:
      RealtimeGateway,
    private pushService:
      PushService,
    private auditLogsService:
      AuditLogsService,
  ) {}

  async findMonthOverview(
    user: AuthUser,
    year: number,
    month: number,
    selectedCinemaId?: number | null,
  ) {
    const cinemaId = resolveShiftCinemaId(user, selectedCinemaId);
    await ensureShiftActorHasCinemaAccess(this.prisma, user, cinemaId);

    return findShiftMonthOverview(
      this.prisma,
      cinemaId,
      year,
      month,
    );
  }
  async previewPlanningShiftReplacement(
    user: AuthUser,
    draftId: number,
    scope: unknown,
    dateKey: unknown,
    selectedCinemaId?: number | null,
  ) {
    const cinemaId = resolveShiftCinemaId(user, selectedCinemaId);
    await ensureShiftActorHasCinemaAccess(this.prisma, user, cinemaId);

    return previewPlanningShiftReplacementFlow(this.prisma, {
      cinemaId,
      draftId,
      scope,
      dateKey,
    });
  }

  async replacePlanningShifts(
    user: AuthUser,
    input: {
      draftId: number;
      scope: unknown;
      dateKey: unknown;
      confirmationText: unknown;
    },
    selectedCinemaId?: number | null,
  ) {
    const cinemaId = resolveShiftCinemaId(user, selectedCinemaId);
    await ensureShiftActorHasCinemaAccess(this.prisma, user, cinemaId);

    return replacePlanningShiftsFlow(
      {
        prisma: this.prisma,
        realtimeGateway: this.realtimeGateway,
        pushService: this.pushService,
      },
      user,
      {
        cinemaId,
        draftId: input.draftId,
        scope: input.scope,
        dateKey: input.dateKey,
        confirmationText: input.confirmationText,
      },
    );
  }

  async previewPlanningShiftRemoval(
    user: AuthUser,
    scope: unknown,
    dateKey: unknown,
    selectedCinemaId?: number | null,
  ) {
    const cinemaId = resolveShiftCinemaId(user, selectedCinemaId);
    await ensureShiftActorHasCinemaAccess(this.prisma, user, cinemaId);

    return previewPlanningShiftRemovalFlow(this.prisma, {
      cinemaId,
      scope,
      dateKey,
    });
  }

  async removePlanningShifts(
    user: AuthUser,
    input: {
      scope: unknown;
      dateKey: unknown;
      confirmationText: unknown;
    },
    selectedCinemaId?: number | null,
  ) {
    const cinemaId = resolveShiftCinemaId(user, selectedCinemaId);
    await ensureShiftActorHasCinemaAccess(this.prisma, user, cinemaId);

    return removePlanningShiftsFlow(
      {
        prisma: this.prisma,
        realtimeGateway: this.realtimeGateway,
        pushService: this.pushService,
      },
      user,
      {
        cinemaId,
        scope: input.scope,
        dateKey: input.dateKey,
        confirmationText: input.confirmationText,
      },
    );
  }


  async findAll(
    user: AuthUser,
    date?: string,
    selectedCinemaId?:
      number | null,
  ) {
    const cinemaId =
      resolveShiftCinemaId(
        user,
        selectedCinemaId,
      );

    await ensureShiftActorHasCinemaAccess(
      this.prisma,
      user,
      cinemaId,
    );

    if (date) {
      return findScheduleShiftsForDay(
        this.prisma,
        cinemaId,
        date,
      );
    }

    return this.prisma.shift.findMany({
      where: {
        cinemaId,
      },
      include: {
        user: true,
        jobFunction: true,
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
    const cinemaId =
      resolveShiftCinemaId(
        user,
        data.cinemaId,
      );

    await ensureShiftActorHasCinemaAccess(
      this.prisma,
      user,
      cinemaId,
    );

    return createShiftFlow({
      prisma:
        this.prisma,
      realtimeGateway:
        this.realtimeGateway,
      pushService:
        this.pushService,
      auditLogsService:
        this.auditLogsService,
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
    const cinemaId =
      resolveShiftCinemaId(
        user,
        data.cinemaId,
      );

    await ensureShiftActorHasCinemaAccess(
      this.prisma,
      user,
      cinemaId,
    );

    return updateShiftFlow({
      prisma:
        this.prisma,
      realtimeGateway:
        this.realtimeGateway,
      pushService:
        this.pushService,
      auditLogsService:
        this.auditLogsService,
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
    selectedCinemaId?:
      number | null,
  ) {
    const cinemaId =
      resolveShiftCinemaId(
        user,
        selectedCinemaId,
      );

    await ensureShiftActorHasCinemaAccess(
      this.prisma,
      user,
      cinemaId,
    );

    return deleteShiftFlow({
      prisma:
        this.prisma,
      realtimeGateway:
        this.realtimeGateway,
      pushService:
        this.pushService,
      auditLogsService:
        this.auditLogsService,
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
