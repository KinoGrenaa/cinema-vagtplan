import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PayrollService } from '../payroll/payroll.service';
import {
  findAllVisibleTimeEntries,
  findOpenTimeEntry,
  findTimeEntriesForUser,
} from './helpers/time-entry-read-helpers';
import { clockInTimeEntry, clockOutTimeEntry } from './helpers/time-entry-clock-flow';
import { submitManualTimeEntry } from './helpers/time-entry-manual-entry-flow';
import { findRevisionsForTimeEntry } from './helpers/time-entry-revision-flow';
import {
  updateAdminTimeEntry,
  updateOwnTimeEntry,
} from './helpers/time-entry-update-flow';
import { approveTimeEntryFlow } from './helpers/time-entry-approve-flow';
import { rejectTimeEntryFlow } from './helpers/time-entry-reject-flow';
import { unapproveTimeEntryFlow } from './helpers/time-entry-unapprove-flow';
import { voidTimeEntryFlow } from './helpers/time-entry-void-flow';

@Injectable()
export class TimeEntriesService {
  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
    private auditLogsService: AuditLogsService,
    private readonly payrollService: PayrollService,
  ) {}

  findForUser(
    userId: number,
    user: any,
    selectedCinemaId?: number | null,
  ) {
    return findTimeEntriesForUser(this.prisma, {
      userId,
      user,
      selectedCinemaId,
    });
  }

  findAll(user: any, selectedCinemaId?: number | null) {
    return findAllVisibleTimeEntries(this.prisma, {
      user,
      selectedCinemaId,
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

  approveEntry(
    id: number,
    user: any,
    selectedCinemaId?: number | null,
    confirmPayrollAdjustment = false,
  ) {
    return approveTimeEntryFlow({
      prisma: this.prisma,
      payrollService: this.payrollService,
      realtimeGateway: this.realtimeGateway,
      auditLogsService: this.auditLogsService,
      id,
      user,
      selectedCinemaId,
      confirmPayrollAdjustment,
    });
  }

  unapproveEntry(
    id: number,
    user: any,
    selectedCinemaId?: number | null,
  ) {
    return unapproveTimeEntryFlow({
      prisma: this.prisma,
      realtimeGateway: this.realtimeGateway,
      auditLogsService: this.auditLogsService,
      id,
      user,
      selectedCinemaId,
    });
  }

  rejectEntry(
    id: number,
    adminNote: string | undefined,
    user: any,
    selectedCinemaId?: number | null,
  ) {
    return rejectTimeEntryFlow({
      prisma: this.prisma,
      realtimeGateway: this.realtimeGateway,
      auditLogsService: this.auditLogsService,
      id,
      adminNote,
      user,
      selectedCinemaId,
    });
  }

  voidEntry(
    id: number,
    adminNote: string | undefined,
    user: any,
    selectedCinemaId?: number | null,
  ) {
    return voidTimeEntryFlow({
      prisma: this.prisma,
      payrollService: this.payrollService,
      realtimeGateway: this.realtimeGateway,
      auditLogsService: this.auditLogsService,
      id,
      adminNote,
      user,
      selectedCinemaId,
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

  updateEntry(
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
    return updateAdminTimeEntry({
      prisma: this.prisma,
      payrollService: this.payrollService,
      realtimeGateway: this.realtimeGateway,
      auditLogsService: this.auditLogsService,
      user,
      id,
      data,
      selectedCinemaId,
    });
  }

  findRevisionsForEntry(
    user: any,
    id: number,
    selectedCinemaId?: number | null,
  ) {
    return findRevisionsForTimeEntry({
      prisma: this.prisma,
      user,
      id,
      selectedCinemaId,
    });
  }
  private async resolveTimeEntryTarget(
    user: any,
    options?: {
      requestedUserId?: number;
      requestedCinemaId?: number;
    },
  ) {
    const actorUserId = this.getAuthenticatedUserId(user);
    const requestedUserId = this.getFiniteNumber(options?.requestedUserId);
    const requestedCinemaId = this.getFiniteNumber(options?.requestedCinemaId);
    const targetUserId =
      this.canActForOtherUsers(user) && requestedUserId
        ? requestedUserId
        : actorUserId;

    if (targetUserId === actorUserId) {
      if (this.isMasterUser(user)) {
        if (!requestedCinemaId) {
          throw new ForbiddenException('MASTER skal vælge en biograf.');
        }

        return {
          userId: actorUserId,
          cinemaId: requestedCinemaId,
        };
      }

      const ownCinemaId = this.getAuthenticatedCinemaId(user);

      if (requestedCinemaId && requestedCinemaId !== ownCinemaId) {
        throw new ForbiddenException('Du har ikke adgang til denne biograf.');
      }

      return {
        userId: actorUserId,
        cinemaId: ownCinemaId,
      };
    }

    if (!this.canActForOtherUsers(user)) {
      throw new ForbiddenException('Du har ikke adgang til denne tidsregistrering.');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        cinemaId: true,
      },
    });

    if (!targetUser?.cinemaId) {
      throw new NotFoundException('Bruger ikke fundet.');
    }

    if (!this.isMasterUser(user)) {
      const actorCinemaId = this.getAuthenticatedCinemaId(user);

      if (targetUser.cinemaId !== actorCinemaId) {
        throw new ForbiddenException('Du har ikke adgang til denne bruger.');
      }
    }

    if (requestedCinemaId && requestedCinemaId !== targetUser.cinemaId) {
      throw new ForbiddenException('Du har ikke adgang til denne biograf.');
    }

    return {
      userId: targetUser.id,
      cinemaId: targetUser.cinemaId,
    };
  }

  private async ensureClockOutAccess(user: any, id: number) {
    const timeEntry = await this.prisma.timeEntry.findUnique({
      where: { id },
      select: {
        userId: true,
        user: {
          select: {
            cinemaId: true,
          },
        },
      },
    });

    if (!timeEntry) {
      throw new NotFoundException('Tidsregistrering ikke fundet.');
    }

    const actorUserId = this.getAuthenticatedUserId(user);

    if (timeEntry.userId === actorUserId) {
      return;
    }

    if (!this.canActForOtherUsers(user)) {
      throw new ForbiddenException('Du har ikke adgang til denne tidsregistrering.');
    }

    if (this.isMasterUser(user)) {
      return;
    }

    const actorCinemaId = this.getAuthenticatedCinemaId(user);

    if (timeEntry.user.cinemaId !== actorCinemaId) {
      throw new ForbiddenException('Du har ikke adgang til denne tidsregistrering.');
    }
  }

  private canActForOtherUsers(user: any) {
    return user?.role === 'ADMIN' || user?.role === 'MASTER';
  }

  private isMasterUser(user: any) {
    return user?.role === 'MASTER';
  }

  private getAuthenticatedUserId(user: any) {
    const userId = this.getFiniteNumber(user?.sub);

    if (!userId) {
      throw new ForbiddenException('Ugyldig bruger.');
    }

    return userId;
  }

  private getAuthenticatedCinemaId(user: any) {
    const cinemaId = this.getFiniteNumber(user?.cinemaId);

    if (!cinemaId) {
      throw new ForbiddenException('Brugeren er ikke tilknyttet en biograf.');
    }

    return cinemaId;
  }

  private getFiniteNumber(value: unknown) {
    const numberValue = Number(value);

    return Number.isFinite(numberValue) && numberValue > 0
      ? numberValue
      : undefined;
  }

}
