import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PayrollService } from '../payroll/payroll.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { approveTimeEntryFlow } from './helpers/time-entry-approve-flow';
import {
  ensureTimeEntryTargetUserAccess,
  getTimeEntryActorUserId,
  resolveTimeEntryActorCinemaId,
} from './helpers/time-entry-cinema-access';
import {
  clockInTimeEntry,
  clockOutTimeEntry,
} from './helpers/time-entry-clock-flow';
import { submitManualTimeEntry } from './helpers/time-entry-manual-entry-flow';
import {
  findAllVisibleTimeEntries,
  findOpenTimeEntry,
  findTimeEntriesForUser,
} from './helpers/time-entry-read-helpers';
import { findRevisionsForTimeEntry } from './helpers/time-entry-revision-flow';
import { rejectTimeEntryFlow } from './helpers/time-entry-reject-flow';
import { unapproveTimeEntryFlow } from './helpers/time-entry-unapprove-flow';
import {
  updateAdminTimeEntry,
  updateOwnTimeEntry,
} from './helpers/time-entry-update-flow';
import { voidTimeEntryFlow } from './helpers/time-entry-void-flow';

@Injectable()
export class TimeEntriesService {
  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
    private auditLogsService: AuditLogsService,
    private readonly payrollService: PayrollService,
  ) {}

  async findForUser(
    userId: number,
    user: any,
    selectedCinemaId?: number | null,
  ) {
    const target = await this.resolveTimeEntryTarget(user, {
      requestedUserId: userId,
      requestedCinemaId: selectedCinemaId ?? undefined,
    });

    return findTimeEntriesForUser(this.prisma, {
      userId: target.userId,
      user,
      selectedCinemaId: target.cinemaId,
    });
  }

  async findAll(
    user: any,
    selectedCinemaId?: number | null,
  ) {
    const cinemaId = await resolveTimeEntryActorCinemaId(
      this.prisma,
      user,
      selectedCinemaId,
    );

    return findAllVisibleTimeEntries(this.prisma, {
      user,
      selectedCinemaId: cinemaId,
    });
  }

  async findOpenEntry(
    user: any,
    requestedUserId?: number,
    requestedCinemaId?: number,
  ) {
    const target = await this.resolveTimeEntryTarget(user, {
      requestedUserId,
      requestedCinemaId,
    });

    return findOpenTimeEntry(this.prisma, {
      userId: target.userId,
      cinemaId: target.cinemaId,
    });
  }

  async submitManualEntry(
    user: any,
    data: {
      userId?: number;
      cinemaId?: number;
      shiftId?: number | null;
      clockIn: string;
      clockOut: string;
      note?: string;
      clockInNote?: string;
      clockOutNote?: string;
    },
  ) {
    const target = await this.resolveTimeEntryTarget(user, {
      requestedUserId: data.userId,
      requestedCinemaId: data.cinemaId,
    });

    return submitManualTimeEntry({
      prisma: this.prisma,
      realtimeGateway: this.realtimeGateway,
      auditLogsService: this.auditLogsService,
      data: {
        ...data,
        userId: target.userId,
        cinemaId: target.cinemaId,
      },
    });
  }

  async clockIn(
    user: any,
    data: {
      userId?: number;
      cinemaId?: number;
      shiftId?: number | null;
      clockIn?: string;
      note?: string;
    },
  ) {
    const target = await this.resolveTimeEntryTarget(user, {
      requestedUserId: data.userId,
      requestedCinemaId: data.cinemaId,
    });

    return clockInTimeEntry({
      prisma: this.prisma,
      realtimeGateway: this.realtimeGateway,
      auditLogsService: this.auditLogsService,
      data: {
        ...data,
        userId: target.userId,
        cinemaId: target.cinemaId,
      },
    });
  }

  async clockOut(
    user: any,
    id: number,
    data?: {
      clockOut?: string;
      note?: string;
    },
  ) {
    await this.ensureClockOutAccess(user, id);

    return clockOutTimeEntry({
      prisma: this.prisma,
      realtimeGateway: this.realtimeGateway,
      auditLogsService: this.auditLogsService,
      id,
      data,
    });
  }

  async approveEntry(
    id: number,
    user: any,
    selectedCinemaId?: number | null,
    confirmPayrollAdjustment = false,
  ) {
    const cinemaId = await resolveTimeEntryActorCinemaId(
      this.prisma,
      user,
      selectedCinemaId,
    );

    return approveTimeEntryFlow({
      prisma: this.prisma,
      payrollService: this.payrollService,
      realtimeGateway: this.realtimeGateway,
      auditLogsService: this.auditLogsService,
      id,
      user,
      selectedCinemaId: cinemaId,
      confirmPayrollAdjustment,
    });
  }

  async unapproveEntry(
    id: number,
    user: any,
    selectedCinemaId?: number | null,
  ) {
    const cinemaId = await resolveTimeEntryActorCinemaId(
      this.prisma,
      user,
      selectedCinemaId,
    );

    return unapproveTimeEntryFlow({
      prisma: this.prisma,
      realtimeGateway: this.realtimeGateway,
      auditLogsService: this.auditLogsService,
      id,
      user,
      selectedCinemaId: cinemaId,
    });
  }

  async rejectEntry(
    id: number,
    adminNote: string | undefined,
    user: any,
    selectedCinemaId?: number | null,
  ) {
    const cinemaId = await resolveTimeEntryActorCinemaId(
      this.prisma,
      user,
      selectedCinemaId,
    );

    return rejectTimeEntryFlow({
      prisma: this.prisma,
      realtimeGateway: this.realtimeGateway,
      auditLogsService: this.auditLogsService,
      id,
      adminNote,
      user,
      selectedCinemaId: cinemaId,
    });
  }

  async voidEntry(
    id: number,
    adminNote: string | undefined,
    user: any,
    selectedCinemaId?: number | null,
  ) {
    const cinemaId = await resolveTimeEntryActorCinemaId(
      this.prisma,
      user,
      selectedCinemaId,
    );

    return voidTimeEntryFlow({
      prisma: this.prisma,
      payrollService: this.payrollService,
      realtimeGateway: this.realtimeGateway,
      auditLogsService: this.auditLogsService,
      id,
      adminNote,
      user,
      selectedCinemaId: cinemaId,
    });
  }

  updateOwnEntry(
    user: any,
    id: number,
    data: {
      clockIn: string;
      clockOut?: string | null;
      clockInNote?: string | null;
      clockOutNote?: string | null;
    },
  ) {
    return updateOwnTimeEntry({
      prisma: this.prisma,
      payrollService: this.payrollService,
      realtimeGateway: this.realtimeGateway,
      auditLogsService: this.auditLogsService,
      user,
      id,
      data,
    });
  }

  async updateEntry(
    user: any,
    id: number,
    data: {
      clockIn?: string;
      clockOut?: string | null;
      clockInNote?: string | null;
      clockOutNote?: string | null;
      adminNote?: string | null;
    },
    selectedCinemaId?: number | null,
  ) {
    const cinemaId = await resolveTimeEntryActorCinemaId(
      this.prisma,
      user,
      selectedCinemaId,
    );

    return updateAdminTimeEntry({
      prisma: this.prisma,
      payrollService: this.payrollService,
      realtimeGateway: this.realtimeGateway,
      auditLogsService: this.auditLogsService,
      user,
      id,
      data,
      selectedCinemaId: cinemaId,
    });
  }

  async findRevisionsForEntry(
    user: any,
    id: number,
    selectedCinemaId?: number | null,
  ) {
    const cinemaId = await resolveTimeEntryActorCinemaId(
      this.prisma,
      user,
      selectedCinemaId,
    );

    return findRevisionsForTimeEntry({
      prisma: this.prisma,
      user,
      id,
      selectedCinemaId: cinemaId,
    });
  }

  private async resolveTimeEntryTarget(
    user: any,
    options?: {
      requestedUserId?: number;
      requestedCinemaId?: number;
    },
  ) {
    const actorUserId = getTimeEntryActorUserId(user);
    const requestedUserId = this.getFiniteNumber(
      options?.requestedUserId,
    );
    const targetUserId =
      this.canActForOtherUsers(user) && requestedUserId
        ? requestedUserId
        : actorUserId;
    const cinemaId = await resolveTimeEntryActorCinemaId(
      this.prisma,
      user,
      options?.requestedCinemaId,
    );

    if (
      targetUserId !== actorUserId &&
      !this.canActForOtherUsers(user)
    ) {
      throw new ForbiddenException(
        'Du har ikke adgang til denne tidsregistrering.',
      );
    }

    if (
      targetUserId !== actorUserId ||
      !this.isMasterUser(user)
    ) {
      await ensureTimeEntryTargetUserAccess(
        this.prisma,
        targetUserId,
        cinemaId,
      );
    }

    return {
      userId: targetUserId,
      cinemaId,
    };
  }

  private async ensureClockOutAccess(
    user: any,
    id: number,
  ) {
    const timeEntry = await this.prisma.timeEntry.findUnique({
      where: {
        id,
      },
      select: {
        userId: true,
        cinemaId: true,
      },
    });

    if (!timeEntry) {
      throw new NotFoundException(
        'Tidsregistrering ikke fundet.',
      );
    }

    const actorUserId = getTimeEntryActorUserId(user);

    if (timeEntry.userId === actorUserId) {
      return;
    }

    if (!this.canActForOtherUsers(user)) {
      throw new ForbiddenException(
        'Du har ikke adgang til denne tidsregistrering.',
      );
    }

    if (this.isMasterUser(user)) {
      return;
    }

    const cinemaId = await resolveTimeEntryActorCinemaId(
      this.prisma,
      user,
    );

    if (timeEntry.cinemaId !== cinemaId) {
      throw new ForbiddenException(
        'Du har ikke adgang til denne tidsregistrering.',
      );
    }
  }

  private canActForOtherUsers(user: any) {
    return (
      user?.role === 'ADMIN' ||
      user?.role === 'MASTER'
    );
  }

  private isMasterUser(user: any) {
    return user?.role === 'MASTER';
  }

  private getFiniteNumber(value: unknown) {
    const numberValue = Number(value);

    return Number.isInteger(numberValue) &&
      numberValue > 0
      ? numberValue
      : undefined;
  }
}
