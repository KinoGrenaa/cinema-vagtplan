import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PayrollService } from '../payroll/payroll.service';
import {
  analyzeTimeEntryDeviation,
  formatSignedDuration,
  getEntryMinutes,
  withTimeEntryDeviation,
} from './helpers/time-entry-deviation';
import { notifyTimeEntryUpdated } from './helpers/time-entry-response';
import {
  recordAdminTimeEntryUpdated,
  recordClockInTimeEntryCreated,
  recordClockOutTimeEntryAudit,
  recordManualTimeEntrySubmitted,
  recordOwnTimeEntryUpdated,
} from './helpers/time-entry-mutation-records';
import { ensureManualEntryDeviationNotes } from './helpers/time-entry-deviation-notes';
import {
  ensureTimeEntryEditable,
  ensureUserCanAccessTimeEntry,
  getTimeEntryCinemaFilter,
} from './helpers/time-entry-access';
import { createOrUpdateTimeEntryPayrollAdjustment } from './helpers/time-entry-payroll-adjustments';
import {
  createEditAfterExportPayrollAdjustmentIfNeeded,
  createVoidAfterExportPayrollAdjustmentIfNeeded,
} from './helpers/time-entry-exported-payroll-adjustments';
import {
  ensureTimeEntryCanBeApproved,
  getApprovalPayrollContext,
  getApprovalPayrollUpdateData,
} from './helpers/time-entry-approval-helpers';
import {
  ensureOwnTimeEntryCanBeUpdated,
  getAdminTimeEntryUpdateContext,
  getOwnTimeEntryUpdateContext,
} from './helpers/time-entry-update-helpers';
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
import {
  getOpenTimeEntryInclude,
  getTimeEntryResponseInclude,
  getTimeEntryWithCinemaShiftInclude,
  getTimeEntryWithUserCinemaInclude,
  getTimeEntryWithUserCinemaShiftInclude,
} from './helpers/time-entry-includes';
import {
  buildCombinedClockOutNote,
  ensureClockOutAfterClockIn,
  ensureNoExistingEntryForShift,
  ensureNoOverlappingManualShift,
  ensureNoOverlappingManualTimeEntry,
  ensureShiftBelongsToUser,
  findManualEntryShift,
  getManualEntryNotes,
  getTrimmedOptionalNote,
  parseOptionalTimeEntryDate,
  parseRequiredTimeEntryDate,
  resolveClockInShift,
} from './helpers/time-entry-service-helpers';

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
    const entries = await this.prisma.timeEntry.findMany({
      where: {
        userId,
        ...getTimeEntryCinemaFilter(user, selectedCinemaId),
      },
      include: getTimeEntryResponseInclude(),
      orderBy: {
        clockIn: 'desc',
      },
    });

    return entries.map((entry) => withTimeEntryDeviation(entry));
  }

  async findAll(user: any, selectedCinemaId?: number | null) {
    const cinemaFilter = getTimeEntryCinemaFilter(user, selectedCinemaId);

    const entries = await this.prisma.timeEntry.findMany({
      where:
        user.role === 'EMPLOYEE'
          ? {
              userId: user.sub,
              ...cinemaFilter,
            }
          : cinemaFilter,
      include: {
        ...getTimeEntryResponseInclude(),
        payrollAdjustments: {
          where: {
            status: 'PENDING',
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        clockIn: 'desc',
      },
    });

    return entries.map((entry) => withTimeEntryDeviation(entry));
  }

  findOpenEntry(userId: number, cinemaId?: number) {
    return this.prisma.timeEntry.findFirst({
      where: {
        userId,
        ...(cinemaId ? { cinemaId } : {}),
        clockOut: null,
        status: 'PENDING',
      },
      include: getOpenTimeEntryInclude(),
      orderBy: {
        clockIn: 'desc',
      },
    });
  }

  async submitManualEntry(data: {
    userId: number;
    cinemaId: number;
    shiftId?: number | null;
    clockIn: string;
    clockOut: string;
    note?: string;
    clockInNote?: string;
    clockOutNote?: string;
  }) {
    const clockIn = parseRequiredTimeEntryDate(
      data.clockIn,
      'Ugyldig mødetid eller fyraften',
    );
    const clockOut = parseRequiredTimeEntryDate(
      data.clockOut,
      'Ugyldig mødetid eller fyraften',
    );

    ensureClockOutAfterClockIn(clockIn, clockOut);

    await ensureNoOverlappingManualTimeEntry(this.prisma, {
      userId: data.userId,
      cinemaId: data.cinemaId,
      clockIn,
      clockOut,
    });

    await ensureNoOverlappingManualShift(this.prisma, {
      userId: data.userId,
      cinemaId: data.cinemaId,
      clockIn,
      clockOut,
    });

    const shift = await findManualEntryShift(this.prisma, {
      shiftId: data.shiftId,
      cinemaId: data.cinemaId,
    });

    ensureShiftBelongsToUser(
      shift,
      data.userId,
      'Du kan kun indsende timer for dine egne vagter',
    );

    const { clockInNote, clockOutNote } = getManualEntryNotes(data);

    if (shift) {
      const deviation = analyzeTimeEntryDeviation(
        {
          clockIn,
          clockOut,
          shift,
        },
        shift.cinema,
      );

      ensureManualEntryDeviationNotes({
        deviation,
        clockInNote,
        clockOutNote,
      });

      await ensureNoExistingEntryForShift(this.prisma, {
        shiftId: shift.id,
        userId: data.userId,
        cinemaId: data.cinemaId,
        message: 'Der er allerede indsendt timer for denne vagt',
      });
    }

    const entry = await this.prisma.timeEntry.create({
      data: {
        userId: data.userId,
        cinemaId: data.cinemaId,
        shiftId: shift?.id || null,
        payrollTypeId: shift?.workType?.payrollTypeId || null,
        clockIn,
        clockOut,
        note: data.note ?? null,
        clockInNote,
        clockOutNote,
        status: 'PENDING',
      },
      include: getTimeEntryResponseInclude(),
    });

    await recordManualTimeEntrySubmitted({
      prisma: this.prisma,
      auditLogsService: this.auditLogsService,
      entry,
      shift,
      changedByUserId: data.userId,
    });

    return notifyTimeEntryUpdated(this.realtimeGateway, entry);
  }

  async clockIn(data: {
    userId: number;
    cinemaId: number;
    shiftId?: number | null;
    clockIn?: string;
    note?: string;
  }) {
    const openEntry = await this.findOpenEntry(data.userId, data.cinemaId);

    if (openEntry) {
      return withTimeEntryDeviation(openEntry);
    }

    const clockIn = parseOptionalTimeEntryDate(data.clockIn, 'Ugyldig mødetid');

    const shift = await resolveClockInShift(this.prisma, {
      shiftId: data.shiftId,
      userId: data.userId,
      cinemaId: data.cinemaId,
      clockIn,
    });

    await ensureNoExistingEntryForShift(this.prisma, {
      shiftId: shift?.id,
      userId: data.userId,
      cinemaId: data.cinemaId,
      message: 'Der findes allerede en tidsregistrering for denne vagt',
    });

    const note = getTrimmedOptionalNote(data.note);

    const entry = await this.prisma.timeEntry.create({
      data: {
        userId: data.userId,
        cinemaId: data.cinemaId,
        shiftId: shift?.id || null,
        payrollTypeId: shift?.workType?.payrollTypeId || null,
        clockIn,
        note,
        clockInNote: note,
        status: 'PENDING',
      },
      include: getTimeEntryResponseInclude(),
    });

    await recordClockInTimeEntryCreated({
      prisma: this.prisma,
      auditLogsService: this.auditLogsService,
      entry,
      shift,
      changedByUserId: data.userId,
    });

    return notifyTimeEntryUpdated(this.realtimeGateway, entry);
  }

  async clockOut(
    id: number,
    data?: {
      clockOut?: string;
      note?: string;
    },
  ) {
    const existingEntry = await this.prisma.timeEntry.findUnique({
      where: { id },
      include: getTimeEntryWithCinemaShiftInclude(),
    });

    if (!existingEntry) {
      throw new NotFoundException('Tidsregistrering blev ikke fundet');
    }

    ensureTimeEntryEditable(existingEntry);

    const clockOut = parseOptionalTimeEntryDate(
      data?.clockOut,
      'Ugyldig fyraften',
    );

    ensureClockOutAfterClockIn(existingEntry.clockIn, clockOut);

    const clockOutNote = getTrimmedOptionalNote(data?.note);
    const combinedNote = buildCombinedClockOutNote(
      existingEntry.note,
      clockOutNote,
    );

    const entry = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        clockOut,
        note: combinedNote || null,
        clockOutNote: clockOutNote || null,
      },
      include: getTimeEntryResponseInclude(),
    });

    await recordClockOutTimeEntryAudit({
      auditLogsService: this.auditLogsService,
      entry,
    });

    return notifyTimeEntryUpdated(this.realtimeGateway, entry);
  }

  async approveEntry(
    id: number,
    user: any,
    selectedCinemaId?: number | null,
    confirmPayrollAdjustment = false,
  ) {
    const changedByUserId = getChangedByUserId(user);
    const existingEntry = await this.prisma.timeEntry.findUnique({
      where: { id },
      include: getTimeEntryWithUserCinemaShiftInclude(),
    });

    if (!existingEntry) {
      throw new NotFoundException('Tidsregistrering blev ikke fundet');
    }

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

  async updateOwnEntry(
    user: any,
    id: number,
    data: {
      clockIn: string;
      clockOut?: string | null;
      clockInNote?: string | null;
      clockOutNote?: string | null;
    },
  ) {
    const existingEntry = await this.prisma.timeEntry.findUnique({
      where: { id },
      include: getTimeEntryWithUserCinemaShiftInclude(),
    });

    if (!existingEntry) {
      throw new NotFoundException('Tidsregistrering blev ikke fundet');
    }

    ensureOwnTimeEntryCanBeUpdated(user, existingEntry);
    ensureTimeEntryEditable(existingEntry, user);

    const {
      newClockIn,
      newClockOut,
      newClockInNote,
      newClockOutNote,
      changes,
    } = getOwnTimeEntryUpdateContext(existingEntry, data);

    const entry = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        clockIn: newClockIn,
        clockOut: newClockOut,
        clockInNote: newClockInNote,
        clockOutNote: newClockOutNote,
        status: 'PENDING',
      },
      include: getTimeEntryResponseInclude(),
    });

    await createEditAfterExportPayrollAdjustmentIfNeeded({
      prisma: this.prisma,
      payrollService: this.payrollService,
      existingEntry,
      entry,
      reason: 'Tidsregistrering rettet af medarbejderen',
      changedByUserId: user.sub,
    });

    await recordOwnTimeEntryUpdated({
      prisma: this.prisma,
      auditLogsService: this.auditLogsService,
      existingEntry,
      entry,
      user,
      changes,
    });

    return notifyTimeEntryUpdated(this.realtimeGateway, entry);
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
    const existingEntry = await this.prisma.timeEntry.findUnique({
      where: { id },
      include: getTimeEntryWithUserCinemaShiftInclude(),
    });

    if (!existingEntry) {
      throw new NotFoundException('Tidsregistrering blev ikke fundet');
    }

    ensureUserCanAccessTimeEntry(user, existingEntry, selectedCinemaId);
    ensureTimeEntryEditable(existingEntry, user);

    const {
      nextClockIn,
      nextClockOut,
      nextClockInNote,
      nextClockOutNote,
      changes,
    } = getAdminTimeEntryUpdateContext(existingEntry, data);

    const entry = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        clockIn: nextClockIn,
        clockOut: nextClockOut,
        clockInNote: nextClockInNote,
        clockOutNote: nextClockOutNote,
        adminNote:
          data.adminNote === undefined
            ? existingEntry.adminNote
            : data.adminNote,
        status: existingEntry.status,
      },
      include: getTimeEntryResponseInclude(),
    });

    await createEditAfterExportPayrollAdjustmentIfNeeded({
      prisma: this.prisma,
      payrollService: this.payrollService,
      existingEntry,
      entry,
      reason: data.adminNote ?? '',
      changedByUserId: user?.sub ?? null,
      useLinkedPayrollPeriod: true,
    });

    await recordAdminTimeEntryUpdated({
      prisma: this.prisma,
      auditLogsService: this.auditLogsService,
      existingEntry,
      entry,
      user,
      changes,
      adminNote: data.adminNote,
    });

    return notifyTimeEntryUpdated(this.realtimeGateway, entry);
  }

  async findRevisionsForEntry(
    user: any,
    id: number,
    selectedCinemaId?: number | null,
  ) {
    const entry = await this.prisma.timeEntry.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        cinemaId: true,
      },
    });

    if (!entry) {
      throw new NotFoundException('Tidsregistrering blev ikke fundet');
    }

    if (user.role === 'EMPLOYEE' && entry.userId !== user.sub) {
      throw new BadRequestException(
        'Du kan kun se historik for dine egne tidsregistreringer',
      );
    }

    ensureUserCanAccessTimeEntry(user, entry, selectedCinemaId);

    return this.prisma.timeEntryRevision.findMany({
      where: {
        timeEntryId: id,
      },
      include: {
        changedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
