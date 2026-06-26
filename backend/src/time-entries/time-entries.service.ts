import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PayrollService } from '../payroll/payroll.service';
import { formatSignedDuration, getEntryMinutes } from './helpers/time-entry-deviation';
import { notifyTimeEntryUpdated } from './helpers/time-entry-response';
import {
  ensureTimeEntryEditable,
  ensureUserCanAccessTimeEntry,
} from './helpers/time-entry-access';
import { createOrUpdateTimeEntryPayrollAdjustment } from './helpers/time-entry-payroll-adjustments';
import { createVoidAfterExportPayrollAdjustmentIfNeeded } from './helpers/time-entry-exported-payroll-adjustments';
import {
  ensureTimeEntryCanBeApproved,
  getApprovalPayrollContext,
  getApprovalPayrollUpdateData,
} from './helpers/time-entry-approval-helpers';
import {
  ensureTimeEntryCanBeUnapproved,
  findEditableStatusActionEntry,
  getChangedByUserId,
  getRequiredStatusActionNote,
  recordApproveTimeEntryStatusChange,
  recordRejectTimeEntryStatusChange,
  recordUnapproveTimeEntryStatusChange,
  recordVoidTimeEntryStatusChange,
} from './helpers/time-entry-status-action-helpers';
import { getTimeEntryResponseInclude } from './helpers/time-entry-includes';
import { findTimeEntryWithUserCinemaShiftOrThrow } from './helpers/time-entry-query-helpers';
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

  async approveEntry(
    id: number,
    user: any,
    selectedCinemaId?: number | null,
    confirmPayrollAdjustment = false,
  ) {
    const changedByUserId = getChangedByUserId(user);
    const existingEntry = await findTimeEntryWithUserCinemaShiftOrThrow(
      this.prisma,
      id,
    );

    ensureUserCanAccessTimeEntry(user, existingEntry, selectedCinemaId);

    const approvalPayrollContext = await getApprovalPayrollContext({
      payrollService: this.payrollService,
      existingEntry,
      confirmPayrollAdjustment,
    });

    ensureTimeEntryEditable(existingEntry, user);
    ensureTimeEntryCanBeApproved(existingEntry);

    const entry = await this.prisma.timeEntry.update({
      where: { id },
      data: getApprovalPayrollUpdateData({
        ...approvalPayrollContext,
        confirmPayrollAdjustment,
      }),
      include: getTimeEntryResponseInclude(),
    });

    if (
      approvalPayrollContext.payrollPeriod?.status === 'EXPORTED' &&
      confirmPayrollAdjustment
    ) {
      const adjustedMinutes = getEntryMinutes(entry);

      await createOrUpdateTimeEntryPayrollAdjustment(this.prisma, {
        timeEntry: entry,
        originalPayrollPeriodId: approvalPayrollContext.payrollPeriod.id,
        settlementPayrollPeriodId:
          approvalPayrollContext.adjustmentPayrollPeriod?.id ?? null,
        type: 'APPROVAL_AFTER_EXPORT',
        exportedMinutes: 0,
        adjustedMinutes,
        reason: `Tidsregistrering godkendt efter eksport. Efterregulering: ${formatSignedDuration(
          adjustedMinutes,
        )}`,
        changedByUserId: changedByUserId ?? null,
      });
    }

    await recordApproveTimeEntryStatusChange({
      prisma: this.prisma,
      auditLogsService: this.auditLogsService,
      existingEntry,
      entry,
      changedByUserId,
    });

    return notifyTimeEntryUpdated(this.realtimeGateway, entry);
  }

  async unapproveEntry(
    id: number,
    user: any,
    selectedCinemaId?: number | null,
  ) {
    const changedByUserId = getChangedByUserId(user);
    const existingEntry = await findEditableStatusActionEntry({
      prisma: this.prisma,
      id,
      user,
      selectedCinemaId,
    });

    ensureTimeEntryCanBeUnapproved(existingEntry);

    const entry = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        status: 'PENDING',
      },
      include: getTimeEntryResponseInclude(),
    });

    await recordUnapproveTimeEntryStatusChange({
      prisma: this.prisma,
      auditLogsService: this.auditLogsService,
      existingEntry,
      entry,
      changedByUserId,
    });

    return notifyTimeEntryUpdated(this.realtimeGateway, entry);
  }

  async rejectEntry(
    id: number,
    adminNote: string | undefined,
    user: any,
    selectedCinemaId?: number | null,
  ) {
    const changedByUserId = getChangedByUserId(user);
    const trimmedAdminNote = getRequiredStatusActionNote(
      adminNote,
      'Admin-begrundelse er påkrævet ved send retur til rettelse',
    );

    const existingEntry = await findEditableStatusActionEntry({
      prisma: this.prisma,
      id,
      user,
      selectedCinemaId,
    });

    const entry = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        status: 'NEEDS_CHANGES',
        adminNote: trimmedAdminNote,
      },
      include: getTimeEntryResponseInclude(),
    });

    await recordRejectTimeEntryStatusChange({
      prisma: this.prisma,
      auditLogsService: this.auditLogsService,
      existingEntry,
      entry,
      changedByUserId,
      reason: trimmedAdminNote,
    });

    return notifyTimeEntryUpdated(this.realtimeGateway, entry);
  }

  async voidEntry(
    id: number,
    adminNote: string | undefined,
    user: any,
    selectedCinemaId?: number | null,
  ) {
    const changedByUserId = getChangedByUserId(user);
    const trimmedAdminNote = getRequiredStatusActionNote(
      adminNote,
      'Admin-begrundelse er påkrævet ved annullering af tidsregistrering',
    );

    const existingEntry = await findEditableStatusActionEntry({
      prisma: this.prisma,
      id,
      user,
      selectedCinemaId,
    });

    if (existingEntry.status === 'VOIDED') {
      throw new BadRequestException(
        'Tidsregistreringen er allerede annulleret',
      );
    }

    const entry = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        status: 'VOIDED',
        adminNote: trimmedAdminNote,
      },
      include: getTimeEntryResponseInclude(),
    });

    await createVoidAfterExportPayrollAdjustmentIfNeeded({
      prisma: this.prisma,
      payrollService: this.payrollService,
      existingEntry,
      entry,
      reason: trimmedAdminNote,
      changedByUserId: changedByUserId ?? null,
    });

    await recordVoidTimeEntryStatusChange({
      prisma: this.prisma,
      auditLogsService: this.auditLogsService,
      existingEntry,
      entry,
      changedByUserId,
      reason: trimmedAdminNote,
    });

    return notifyTimeEntryUpdated(this.realtimeGateway, entry);
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
