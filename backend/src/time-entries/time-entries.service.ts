import { Injectable } from '@nestjs/common';
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

  findOpenEntry(userId: number, cinemaId?: number) {
    return findOpenTimeEntry(this.prisma, {
      userId,
      cinemaId,
    });
  }

  submitManualEntry(data: {
    userId: number;
    cinemaId: number;
    shiftId?: number | null;
    clockIn: string;
    clockOut: string;
    note?: string;
    clockInNote?: string;
    clockOutNote?: string;
  }) {
    return submitManualTimeEntry({
      prisma: this.prisma,
      realtimeGateway: this.realtimeGateway,
      auditLogsService: this.auditLogsService,
      data,
    });
  }

  clockIn(data: {
    userId: number;
    cinemaId: number;
    shiftId?: number | null;
    clockIn?: string;
    note?: string;
  }) {
    return clockInTimeEntry({
      prisma: this.prisma,
      realtimeGateway: this.realtimeGateway,
      auditLogsService: this.auditLogsService,
      data,
    });
  }

  clockOut(
    id: number,
    data?: {
      clockOut?: string;
      note?: string;
    },
  ) {
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
}
