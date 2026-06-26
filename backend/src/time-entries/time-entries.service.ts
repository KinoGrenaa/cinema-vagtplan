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
import {
  ensureAdminTimeEntryDeviationNotes,
  ensureManualEntryDeviationNotes,
  ensureOwnTimeEntryDeviationNotes,
} from './helpers/time-entry-deviation-notes';
import {
  ensureTimeEntryEditable,
  ensureUserCanAccessTimeEntry,
  getTimeEntryCinemaFilter,
} from './helpers/time-entry-access';
import { createTimeEntryRevision } from './helpers/time-entry-revisions';
import {
  createDetailedTimeEntryRevisionSnapshot,
  createTimeEntryRevisionSnapshot,
} from './helpers/time-entry-revision-snapshots';
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
  getAdminTimeEntryUpdateChanges,
  getOwnTimeEntryUpdateChanges,
} from './helpers/time-entry-update-changes';
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
  ensureRequiredText,
  ensureShiftBelongsToUser,
  findManualEntryShift,
  getManualEntryNotes,
  getRequiredTrimmedNote,
  getTrimmedOptionalNote,
  parseNullableTimeEntryDate,
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

    await createTimeEntryRevision(this.prisma, {
      timeEntryId: entry.id,
      changedByUserId: data.userId,
      action: 'CREATED',
      before: null,
      after: createDetailedTimeEntryRevisionSnapshot(entry),
      reason: null,
    });

    await this.auditLogsService.create({
      action: 'SUBMIT_MANUAL_TIME_ENTRY',
      entityType: 'TimeEntry',
      entityId: entry.id,
      description: shift
        ? 'Medarbejder indsendte manuel tidsregistrering på planlagt vagt'
        : 'Medarbejder indsendte manuel tidsregistrering uden tilknyttet vagt',
      userId: entry.userId,
      cinemaId: entry.cinemaId,
    });

    const response = withTimeEntryDeviation(entry);

    this.realtimeGateway.notifyCinema(
      entry.cinemaId,
      'timeEntriesUpdated',
      response,
    );

    return response;
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

    await createTimeEntryRevision(this.prisma, {
      timeEntryId: entry.id,
      changedByUserId: data.userId,
      action: 'CREATED',
      before: null,
      after: createDetailedTimeEntryRevisionSnapshot(entry),
      reason: null,
    });

    await this.auditLogsService.create({
      action: 'CLOCK_IN',
      entityType: 'TimeEntry',
      entityId: entry.id,
      description: shift
        ? 'Medarbejder registrerede mødetid på planlagt vagt'
        : 'Medarbejder registrerede mødetid uden tilknyttet vagt',
      userId: entry.userId,
      cinemaId: entry.cinemaId,
    });

    const response = withTimeEntryDeviation(entry);

    this.realtimeGateway.notifyCinema(
      entry.cinemaId,
      'timeEntriesUpdated',
      response,
    );

    return response;
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

    await this.auditLogsService.create({
      action: 'CLOCK_OUT',
      entityType: 'TimeEntry',
      entityId: entry.id,
      description: 'Medarbejder registrerede fyraften',
      userId: entry.userId,
      cinemaId: entry.cinemaId,
    });

    const response = withTimeEntryDeviation(entry);

    this.realtimeGateway.notifyCinema(
      entry.cinemaId,
      'timeEntriesUpdated',
      response,
    );

    return response;
  }

  async approveEntry(
    id: number,
    user: any,
    selectedCinemaId?: number | null,
    confirmPayrollAdjustment = false,
  ) {
    const changedByUserId = user?.sub ?? null;
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

    await createTimeEntryRevision(this.prisma, {
      timeEntryId: entry.id,
      changedByUserId: changedByUserId ?? null,
      action: 'APPROVED',
      before: createTimeEntryRevisionSnapshot(existingEntry),
      after: createTimeEntryRevisionSnapshot(entry),
      reason: 'Tidsregistrering godkendt',
    });

    await this.auditLogsService.create({
      action: 'APPROVE_TIME_ENTRY',
      entityType: 'TimeEntry',
      entityId: entry.id,
      description: `Status ændret fra ${existingEntry.status} til APPROVED for ${existingEntry.user.firstName} ${existingEntry.user.lastName}`,
      userId: changedByUserId ?? undefined,
      cinemaId: entry.cinemaId,
    });

    const response = withTimeEntryDeviation(entry);

    this.realtimeGateway.notifyCinema(
      entry.cinemaId,
      'timeEntriesUpdated',
      response,
    );

    return response;
  }

  async unapproveEntry(
    id: number,
    user: any,
    selectedCinemaId?: number | null,
  ) {
    const changedByUserId = user?.sub ?? null;
    const existingEntry = await this.prisma.timeEntry.findUnique({
      where: { id },
      include: getTimeEntryWithUserCinemaInclude(),
    });

    if (!existingEntry) {
      throw new NotFoundException('Tidsregistrering blev ikke fundet');
    }

    ensureUserCanAccessTimeEntry(user, existingEntry, selectedCinemaId);
    ensureTimeEntryEditable(existingEntry, user);

    if (existingEntry.status === 'VOIDED') {
      throw new BadRequestException(
        'En annulleret tidsregistrering kan ikke genåbnes',
      );
    }

    const entry = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        status: 'PENDING',
      },
      include: getTimeEntryResponseInclude(),
    });

    await createTimeEntryRevision(this.prisma, {
      timeEntryId: entry.id,
      changedByUserId: changedByUserId ?? null,
      action: 'UNAPPROVED',
      before: createTimeEntryRevisionSnapshot(existingEntry),
      after: createTimeEntryRevisionSnapshot(entry),
      reason: 'Godkendelse fjernet',
    });

    await this.auditLogsService.create({
      action: 'UNAPPROVE_TIME_ENTRY',
      entityType: 'TimeEntry',
      entityId: entry.id,
      description: `Status ændret fra ${existingEntry.status} til PENDING for ${existingEntry.user.firstName} ${existingEntry.user.lastName}`,
      userId: changedByUserId ?? undefined,
      cinemaId: entry.cinemaId,
    });

    const response = withTimeEntryDeviation(entry);

    this.realtimeGateway.notifyCinema(
      entry.cinemaId,
      'timeEntriesUpdated',
      response,
    );

    return response;
  }

  async rejectEntry(
    id: number,
    adminNote: string | undefined,
    user: any,
    selectedCinemaId?: number | null,
  ) {
    const changedByUserId = user?.sub ?? null;
    const trimmedAdminNote = getRequiredTrimmedNote(
      adminNote,
      'Admin-begrundelse er påkrævet ved send retur til rettelse',
    );

    const existingEntry = await this.prisma.timeEntry.findUnique({
      where: { id },
      include: getTimeEntryWithUserCinemaInclude(),
    });

    if (!existingEntry) {
      throw new NotFoundException('Tidsregistrering blev ikke fundet');
    }

    ensureUserCanAccessTimeEntry(user, existingEntry, selectedCinemaId);
    ensureTimeEntryEditable(existingEntry, user);

    const entry = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        status: 'NEEDS_CHANGES',
        adminNote: trimmedAdminNote,
      },
      include: getTimeEntryResponseInclude(),
    });

    await createTimeEntryRevision(this.prisma, {
      timeEntryId: entry.id,
      changedByUserId: changedByUserId ?? null,
      action: 'NEEDS_CHANGES',
      before: createTimeEntryRevisionSnapshot(existingEntry),
      after: createTimeEntryRevisionSnapshot(entry),
      reason: trimmedAdminNote,
    });

    await this.auditLogsService.create({
      action: 'SEND_BACK_TIME_ENTRY',
      entityType: 'TimeEntry',
      entityId: entry.id,
      description: `Sendt retur til rettelse for ${existingEntry.user.firstName} ${existingEntry.user.lastName}`,
      userId: changedByUserId ?? undefined,
      cinemaId: entry.cinemaId,
    });

    const response = withTimeEntryDeviation(entry);

    this.realtimeGateway.notifyCinema(
      entry.cinemaId,
      'timeEntriesUpdated',
      response,
    );

    return response;
  }

  async voidEntry(
    id: number,
    adminNote: string | undefined,
    user: any,
    selectedCinemaId?: number | null,
  ) {
    const changedByUserId = user?.sub ?? null;
    const trimmedAdminNote = getRequiredTrimmedNote(
      adminNote,
      'Admin-begrundelse er påkrævet ved annullering af tidsregistrering',
    );

    const existingEntry = await this.prisma.timeEntry.findUnique({
      where: { id },
      include: getTimeEntryWithUserCinemaInclude(),
    });

    if (!existingEntry) {
      throw new NotFoundException('Tidsregistrering blev ikke fundet');
    }

    ensureUserCanAccessTimeEntry(user, existingEntry, selectedCinemaId);
    ensureTimeEntryEditable(existingEntry, user);

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

    await createTimeEntryRevision(this.prisma, {
      timeEntryId: entry.id,
      changedByUserId: changedByUserId ?? null,
      action: 'VOIDED',
      before: createDetailedTimeEntryRevisionSnapshot(existingEntry),
      after: createDetailedTimeEntryRevisionSnapshot(entry),
      reason: trimmedAdminNote,
    });

    await this.auditLogsService.create({
      action: 'VOID_TIME_ENTRY',
      entityType: 'TimeEntry',
      entityId: entry.id,
      description: `Tidsregistrering annulleret for ${existingEntry.user.firstName} ${existingEntry.user.lastName}`,
      userId: changedByUserId ?? undefined,
      cinemaId: entry.cinemaId,
    });

    const response = withTimeEntryDeviation(entry);

    this.realtimeGateway.notifyCinema(
      entry.cinemaId,
      'timeEntriesUpdated',
      response,
    );

    return response;
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

    if (existingEntry.userId !== user.sub) {
      throw new BadRequestException(
        'Du kan kun rette dine egne tidsregistreringer',
      );
    }

    if (existingEntry.status === 'APPROVED') {
      throw new BadRequestException(
        'Denne tidsregistrering er allerede godkendt og kan ikke ændres',
      );
    }

    if (existingEntry.status === 'VOIDED') {
      throw new BadRequestException(
        'En annulleret tidsregistrering kan ikke ændres',
      );
    }

    ensureTimeEntryEditable(existingEntry, user);

    const newClockIn = parseRequiredTimeEntryDate(
      data.clockIn,
      'Ugyldig mødetid',
    );
    const newClockOut = parseNullableTimeEntryDate(
      data.clockOut,
      'Ugyldig fyraften',
    );
    const newClockInNote = data.clockInNote ?? null;
    const newClockOutNote = data.clockOutNote ?? null;

    ensureClockOutAfterClockIn(newClockIn, newClockOut);

    const deviation = analyzeTimeEntryDeviation(
      {
        ...existingEntry,
        clockIn: newClockIn,
        clockOut: newClockOut,
      },
      existingEntry.cinema,
    );

    ensureOwnTimeEntryDeviationNotes({
      deviation,
      clockInNote: newClockInNote,
      clockOutNote: newClockOutNote,
    });

    const changes = getOwnTimeEntryUpdateChanges({
      existingEntry,
      newClockIn,
      newClockOut,
      newClockInNote,
      newClockOutNote,
    });

    if (changes.length === 0) {
      throw new BadRequestException('Ingen ændringer registreret');
    }

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

    await createTimeEntryRevision(this.prisma, {
      timeEntryId: entry.id,
      changedByUserId: user.sub,
      action: 'UPDATED',
      before: createDetailedTimeEntryRevisionSnapshot(existingEntry),
      after: createDetailedTimeEntryRevisionSnapshot(entry),
      reason: changes.join('\n'),
    });

    await this.auditLogsService.create({
      action: 'UPDATE_OWN_TIME_ENTRY',
      entityType: 'TimeEntry',
      entityId: entry.id,
      description: [
        `Medarbejder rettede egen tidsregistrering for ${existingEntry.user.firstName} ${existingEntry.user.lastName}.`,
        ...changes,
      ].join('\n'),
      userId: user.sub,
      cinemaId: entry.cinemaId,
    });

    const response = withTimeEntryDeviation(entry);

    this.realtimeGateway.notifyCinema(
      entry.cinemaId,
      'timeEntriesUpdated',
      response,
    );

    return response;
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

    ensureRequiredText(
      data.adminNote,
      'Admin-note er påkrævet ved rettelse af timer',
    );

    const nextClockIn = data.clockIn
      ? parseRequiredTimeEntryDate(data.clockIn, 'Ugyldig mødetid')
      : existingEntry.clockIn;

    const nextClockOut =
      data.clockOut === undefined
        ? existingEntry.clockOut
        : parseNullableTimeEntryDate(data.clockOut, 'Ugyldig fyraften');

    ensureClockOutAfterClockIn(nextClockIn, nextClockOut);

    const nextClockInNote =
      data.clockInNote === undefined
        ? existingEntry.clockInNote
        : data.clockInNote;
    const nextClockOutNote =
      data.clockOutNote === undefined
        ? existingEntry.clockOutNote
        : data.clockOutNote;

    const deviation = analyzeTimeEntryDeviation(
      {
        ...existingEntry,
        clockIn: nextClockIn,
        clockOut: nextClockOut,
      },
      existingEntry.cinema,
    );

    ensureAdminTimeEntryDeviationNotes({
      deviation,
      clockInNote: nextClockInNote,
      clockOutNote: nextClockOutNote,
      adminNote: data.adminNote,
    });

    const changes = getAdminTimeEntryUpdateChanges({
      existingEntry,
      nextClockIn,
      nextClockOut,
      data,
    });

    if (changes.length === 0) {
      throw new BadRequestException('Ingen ændringer registreret');
    }

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

    await createTimeEntryRevision(this.prisma, {
      timeEntryId: entry.id,
      changedByUserId: user?.sub ?? null,
      action: 'UPDATED',
      before: createDetailedTimeEntryRevisionSnapshot(existingEntry),
      after: createDetailedTimeEntryRevisionSnapshot(entry),
      reason: data.adminNote,
    });

    for (const change of changes) {
      await this.auditLogsService.create({
        action: 'UPDATE_TIME_ENTRY_FIELD',
        entityType: 'TimeEntry',
        entityId: entry.id,
        description: change,
        userId: user?.sub ?? null,
        cinemaId: entry.cinemaId,
      });
    }

    await this.auditLogsService.create({
      action: 'UPDATE_TIME_ENTRY',
      entityType: 'TimeEntry',
      entityId: entry.id,
      description: [
        `Rettede tidsregistrering for ${existingEntry.user.firstName} ${existingEntry.user.lastName}.`,
        ...changes,
        `Begrundelse: ${data.adminNote}`,
      ].join('\n'),
      userId: user?.sub ?? null,
      cinemaId: entry.cinemaId,
    });

    const response = withTimeEntryDeviation(entry);

    this.realtimeGateway.notifyCinema(
      entry.cinemaId,
      'timeEntriesUpdated',
      response,
    );

    return response;
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
