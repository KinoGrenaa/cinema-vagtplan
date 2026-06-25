import {
  BadRequestException,
  ConflictException,
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
  hasText,
  withTimeEntryDeviation,
} from './helpers/time-entry-deviation';
import {
  ensureAdminTimeEntryDeviationNotes,
  ensureApprovalDeviationNotes,
  ensureManualEntryDeviationNotes,
  ensureOwnTimeEntryDeviationNotes,
} from './helpers/time-entry-deviation-notes';
import {
  ensureTimeEntryEditable,
  ensureUserCanAccessTimeEntry,
  getTimeEntryCinemaFilter,
} from './helpers/time-entry-access';
import { createTimeEntryRevision } from './helpers/time-entry-revisions';
import { createOrUpdateTimeEntryPayrollAdjustment } from './helpers/time-entry-payroll-adjustments';
import {
  getAdminTimeEntryUpdateChanges,
  getOwnTimeEntryUpdateChanges,
} from './helpers/time-entry-update-changes';
import { findMatchingShiftForClockIn } from './helpers/time-entry-shifts';
import {
  getOpenTimeEntryInclude,
  getShiftWithWorkTypeAndCinemaInclude,
  getTimeEntryResponseInclude,
  getTimeEntryWithCinemaShiftInclude,
  getTimeEntryWithUserCinemaInclude,
  getTimeEntryWithUserCinemaShiftInclude,
} from './helpers/time-entry-includes';

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
    const clockIn = new Date(data.clockIn);
    const clockOut = new Date(data.clockOut);

    if (Number.isNaN(clockIn.getTime()) || Number.isNaN(clockOut.getTime())) {
      throw new BadRequestException('Ugyldig mødetid eller fyraften');
    }

    if (clockOut <= clockIn) {
      throw new BadRequestException('Fyraften skal være efter mødetid');
    }

    const overlappingTimeEntry = await this.prisma.timeEntry.findFirst({
      where: {
        userId: data.userId,
        cinemaId: data.cinemaId,
        status: {
          not: 'VOIDED',
        },
        clockOut: {
          not: null,
        },
        AND: [
          {
            clockIn: {
              lt: clockOut,
            },
          },
          {
            clockOut: {
              gt: clockIn,
            },
          },
        ],
      },
    });

    if (overlappingTimeEntry) {
      throw new BadRequestException(
        'Der findes allerede en tidsregistrering i dette tidsrum',
      );
    }

    const overlappingShift = await this.prisma.shift.findFirst({
      where: {
        userId: data.userId,
        cinemaId: data.cinemaId,
        AND: [
          {
            startTime: {
              lt: clockOut,
            },
          },
          {
            endTime: {
              gt: clockIn,
            },
          },
        ],
      },
    });

    if (overlappingShift) {
      throw new BadRequestException(
        'Du har allerede en planlagt vagt i dette tidsrum. Registrer tid på vagten i stedet.',
      );
    }

    const shift = data.shiftId
      ? await this.prisma.shift.findFirst({
          where: {
            id: data.shiftId,
            cinemaId: data.cinemaId,
          },
          include: getShiftWithWorkTypeAndCinemaInclude(),
        })
      : null;

    if (data.shiftId && !shift) {
      throw new BadRequestException('Vagten blev ikke fundet');
    }

    if (shift && shift.userId !== data.userId) {
      throw new BadRequestException(
        'Du kan kun indsende timer for dine egne vagter',
      );
    }

    const clockInNote = data.clockInNote ?? data.note ?? null;
    const clockOutNote = data.clockOutNote ?? data.note ?? null;

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

      const existingEntry = await this.prisma.timeEntry.findFirst({
        where: {
          userId: data.userId,
          shiftId: shift.id,
          cinemaId: data.cinemaId,
        },
      });

      if (existingEntry) {
        throw new BadRequestException(
          'Der er allerede indsendt timer for denne vagt',
        );
      }
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
      after: {
        status: entry.status,
        clockIn: entry.clockIn,
        clockOut: entry.clockOut,
        note: entry.note,
        clockInNote: entry.clockInNote,
        clockOutNote: entry.clockOutNote,
        adminNote: entry.adminNote,
      },
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

    const clockIn = data.clockIn ? new Date(data.clockIn) : new Date();

    if (Number.isNaN(clockIn.getTime())) {
      throw new BadRequestException('Ugyldig mødetid');
    }

    let shift: any = null;

    if (data.shiftId) {
      shift = await this.prisma.shift.findFirst({
        where: {
          id: data.shiftId,
          cinemaId: data.cinemaId,
        },
        include: {
          workType: true,
        },
      });

      if (!shift) {
        throw new BadRequestException('Vagten blev ikke fundet');
      }

      if (shift.userId !== data.userId) {
        throw new BadRequestException(
          'Du kan kun registrere mødetid på dine egne vagter',
        );
      }
    } else {
      shift = await findMatchingShiftForClockIn(this.prisma, {
        userId: data.userId,
        cinemaId: data.cinemaId,
        clockIn,
      });
    }

    if (shift?.id) {
      const existingShiftEntry = await this.prisma.timeEntry.findFirst({
        where: {
          shiftId: shift.id,
          userId: data.userId,
          cinemaId: data.cinemaId,
        },
      });

      if (existingShiftEntry) {
        throw new BadRequestException(
          'Der findes allerede en tidsregistrering for denne vagt',
        );
      }
    }

    const note = data.note?.trim() || null;

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
      after: {
        status: entry.status,
        clockIn: entry.clockIn,
        clockOut: entry.clockOut,
        note: entry.note,
        clockInNote: entry.clockInNote,
        clockOutNote: entry.clockOutNote,
        adminNote: entry.adminNote,
      },
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

    const clockOut = data?.clockOut ? new Date(data.clockOut) : new Date();

    if (Number.isNaN(clockOut.getTime())) {
      throw new BadRequestException('Ugyldig fyraften');
    }

    if (clockOut <= existingEntry.clockIn) {
      throw new BadRequestException('Fyraften skal være efter mødetid');
    }

    const clockOutNote = data?.note?.trim();

    const combinedNote = [
      existingEntry.note,
      clockOutNote ? `Fyraften: ${clockOutNote}` : null,
    ]
      .filter((note): note is string => Boolean(note))
      .join('\n\n');

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

    const payrollPeriod =
      await this.payrollService.getPayrollPeriodEntityForDate(
        existingEntry.cinemaId,
        existingEntry.clockIn,
      );

    if (payrollPeriod?.status === 'LOCKED') {
      throw new ConflictException({
        code: 'PAYROLL_PERIOD_LOCKED',
        title: 'Lønperioden er låst',
        message: 'Lås lønperioden op før tidsregistreringen kan godkendes.',
      });
    }

    if (payrollPeriod?.status === 'EXPORTED' && !confirmPayrollAdjustment) {
      const adjustmentPayrollPeriod =
        await this.payrollService.getCurrentPayrollPeriodEntity(
          existingEntry.cinemaId,
        );

      throw new ConflictException({
        code: 'PAYROLL_PERIOD_EXPORTED',
        title: 'Lønperioden er allerede eksporteret',
        message:
          'Denne tidsregistrering tilhører en lønperiode, der allerede er eksporteret.',

        originalPayrollPeriod: {
          id: payrollPeriod.id,
          startDate: payrollPeriod.startDate,
          endDate: payrollPeriod.endDate,
        },

        adjustmentPayrollPeriod: adjustmentPayrollPeriod
          ? {
              id: adjustmentPayrollPeriod.id,
              startDate: adjustmentPayrollPeriod.startDate,
              endDate: adjustmentPayrollPeriod.endDate,
            }
          : null,
      });
    }

    ensureTimeEntryEditable(existingEntry, user);

    if (existingEntry.status === 'VOIDED') {
      throw new BadRequestException(
        'En annulleret tidsregistrering kan ikke godkendes',
      );
    }

    const deviation = analyzeTimeEntryDeviation(
      existingEntry,
      existingEntry.cinema,
    );

    if (deviation.types.includes('OPEN_ENTRY')) {
      throw new BadRequestException(
        'En åben tidsregistrering kan ikke godkendes',
      );
    }

    ensureApprovalDeviationNotes({
      deviation,
      clockInNote: existingEntry.clockInNote,
      clockOutNote: existingEntry.clockOutNote,
      note: existingEntry.note,
    });

    let adjustmentPayrollPeriodId: number | null = null;
    let adjustmentPayrollPeriod: any = null;

    if (payrollPeriod?.status === 'EXPORTED' && confirmPayrollAdjustment) {
      adjustmentPayrollPeriod =
        await this.payrollService.getCurrentPayrollPeriodEntity(
          existingEntry.cinemaId,
        );

      adjustmentPayrollPeriodId = adjustmentPayrollPeriod?.id ?? null;
    }

    const entry = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        status: 'APPROVED',

        payrollPeriodId:
          payrollPeriod?.status === 'EXPORTED' && confirmPayrollAdjustment
            ? null
            : payrollPeriod?.id,

        isPayrollAdjustment:
          payrollPeriod?.status === 'EXPORTED' && confirmPayrollAdjustment,

        originalPayrollPeriodId:
          payrollPeriod?.status === 'EXPORTED' && confirmPayrollAdjustment
            ? payrollPeriod.id
            : null,

        adjustmentPayrollPeriodId,

        payrollAdjustmentReason:
          payrollPeriod?.status === 'EXPORTED' && confirmPayrollAdjustment
            ? 'Godkendt som efterregulering, fordi lønperioden allerede var eksporteret.'
            : null,
      },
      include: getTimeEntryResponseInclude(),
    });

    if (payrollPeriod?.status === 'EXPORTED' && confirmPayrollAdjustment) {
      const adjustedMinutes = getEntryMinutes(entry);

      await createOrUpdateTimeEntryPayrollAdjustment(this.prisma, {
        timeEntry: entry,
        originalPayrollPeriodId: payrollPeriod.id,
        settlementPayrollPeriodId: adjustmentPayrollPeriod?.id ?? null,
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
      before: {
        status: existingEntry.status,
        clockIn: existingEntry.clockIn,
        clockOut: existingEntry.clockOut,
        note: existingEntry.note,
        adminNote: existingEntry.adminNote,
      },
      after: {
        status: entry.status,
        clockIn: entry.clockIn,
        clockOut: entry.clockOut,
        note: entry.note,
        adminNote: entry.adminNote,
      },
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
      before: {
        status: existingEntry.status,
        clockIn: existingEntry.clockIn,
        clockOut: existingEntry.clockOut,
        note: existingEntry.note,
        adminNote: existingEntry.adminNote,
      },
      after: {
        status: entry.status,
        clockIn: entry.clockIn,
        clockOut: entry.clockOut,
        note: entry.note,
        adminNote: entry.adminNote,
      },
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
    if (!adminNote?.trim()) {
      throw new BadRequestException(
        'Admin-begrundelse er påkrævet ved send retur til rettelse',
      );
    }

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
        adminNote: adminNote.trim(),
      },
      include: getTimeEntryResponseInclude(),
    });

    await createTimeEntryRevision(this.prisma, {
      timeEntryId: entry.id,
      changedByUserId: changedByUserId ?? null,
      action: 'NEEDS_CHANGES',
      before: {
        status: existingEntry.status,
        clockIn: existingEntry.clockIn,
        clockOut: existingEntry.clockOut,
        note: existingEntry.note,
        adminNote: existingEntry.adminNote,
      },
      after: {
        status: entry.status,
        clockIn: entry.clockIn,
        clockOut: entry.clockOut,
        note: entry.note,
        adminNote: entry.adminNote,
      },
      reason: adminNote.trim(),
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
    if (!adminNote?.trim()) {
      throw new BadRequestException(
        'Admin-begrundelse er påkrævet ved annullering af tidsregistrering',
      );
    }

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
        adminNote: adminNote.trim(),
      },
      include: getTimeEntryResponseInclude(),
    });

    const payrollPeriod =
      await this.payrollService.getPayrollPeriodEntityForDate(
        existingEntry.cinemaId,
        existingEntry.clockIn,
      );

    if (payrollPeriod?.status === 'EXPORTED') {
      const adjustmentPayrollPeriod =
        await this.payrollService.getCurrentPayrollPeriodEntity(
          existingEntry.cinemaId,
        );
      const exportedMinutes = getEntryMinutes(existingEntry);

      await createOrUpdateTimeEntryPayrollAdjustment(this.prisma, {
        timeEntry: entry,
        originalPayrollPeriodId: payrollPeriod.id,
        settlementPayrollPeriodId: adjustmentPayrollPeriod?.id ?? null,
        type: 'EDIT_AFTER_EXPORT',
        exportedMinutes,
        adjustedMinutes: 0,
        reason: `Tidsregistrering annulleret efter eksport. Efterregulering: ${formatSignedDuration(
          -exportedMinutes,
        )}. Årsag: ${adminNote.trim()}`,
        changedByUserId: changedByUserId ?? null,
      });
    }

    await createTimeEntryRevision(this.prisma, {
      timeEntryId: entry.id,
      changedByUserId: changedByUserId ?? null,
      action: 'VOIDED',
      before: {
        status: existingEntry.status,
        clockIn: existingEntry.clockIn,
        clockOut: existingEntry.clockOut,
        note: existingEntry.note,
        clockInNote: existingEntry.clockInNote,
        clockOutNote: existingEntry.clockOutNote,
        adminNote: existingEntry.adminNote,
      },
      after: {
        status: entry.status,
        clockIn: entry.clockIn,
        clockOut: entry.clockOut,
        note: entry.note,
        clockInNote: entry.clockInNote,
        clockOutNote: entry.clockOutNote,
        adminNote: entry.adminNote,
      },
      reason: adminNote.trim(),
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

    const newClockIn = new Date(data.clockIn);
    const newClockOut = data.clockOut ? new Date(data.clockOut) : null;
    const newClockInNote = data.clockInNote ?? null;
    const newClockOutNote = data.clockOutNote ?? null;

    if (Number.isNaN(newClockIn.getTime())) {
      throw new BadRequestException('Ugyldig mødetid');
    }

    if (newClockOut && Number.isNaN(newClockOut.getTime())) {
      throw new BadRequestException('Ugyldig fyraften');
    }

    if (newClockOut && newClockOut <= newClockIn) {
      throw new BadRequestException('Fyraften skal være efter mødetid');
    }

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

    const payrollPeriod =
      await this.payrollService.getPayrollPeriodEntityForDate(
        existingEntry.cinemaId,
        existingEntry.clockIn,
      );

    if (payrollPeriod?.status === 'EXPORTED') {
      const adjustmentPayrollPeriod =
        await this.payrollService.getCurrentPayrollPeriodEntity(
          existingEntry.cinemaId,
        );
      const exportedMinutes = getEntryMinutes(existingEntry);
      const adjustedMinutes = getEntryMinutes(entry);

      await createOrUpdateTimeEntryPayrollAdjustment(this.prisma, {
        timeEntry: entry,
        originalPayrollPeriodId: payrollPeriod.id,
        settlementPayrollPeriodId: adjustmentPayrollPeriod?.id ?? null,
        type: 'EDIT_AFTER_EXPORT',
        exportedMinutes,
        adjustedMinutes,
        reason: `Tidsregistrering rettet efter eksport. Tidligere registreret: ${formatSignedDuration(
          exportedMinutes,
        ).replace('+', '')}. Ny registrering: ${formatSignedDuration(
          adjustedMinutes,
        ).replace('+', '')}. Efterregulering: ${formatSignedDuration(
          adjustedMinutes - exportedMinutes,
        )}. Årsag: Tidsregistrering rettet af medarbejderen`,
        changedByUserId: user.sub,
      });
    }

    await createTimeEntryRevision(this.prisma, {
      timeEntryId: entry.id,
      changedByUserId: user.sub,
      action: 'UPDATED',
      before: {
        status: existingEntry.status,
        clockIn: existingEntry.clockIn,
        clockOut: existingEntry.clockOut,
        note: existingEntry.note,
        clockInNote: existingEntry.clockInNote,
        clockOutNote: existingEntry.clockOutNote,
        adminNote: existingEntry.adminNote,
      },
      after: {
        status: entry.status,
        clockIn: entry.clockIn,
        clockOut: entry.clockOut,
        note: entry.note,
        clockInNote: entry.clockInNote,
        clockOutNote: entry.clockOutNote,
        adminNote: entry.adminNote,
      },
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

    if (!hasText(data.adminNote)) {
      throw new BadRequestException(
        'Admin-note er påkrævet ved rettelse af timer',
      );
    }

    const nextClockIn = data.clockIn
      ? new Date(data.clockIn)
      : existingEntry.clockIn;

    const nextClockOut =
      data.clockOut === undefined
        ? existingEntry.clockOut
        : data.clockOut
          ? new Date(data.clockOut)
          : null;

    if (Number.isNaN(nextClockIn.getTime())) {
      throw new BadRequestException('Ugyldig mødetid');
    }

    if (nextClockOut && Number.isNaN(nextClockOut.getTime())) {
      throw new BadRequestException('Ugyldig fyraften');
    }

    if (nextClockOut && nextClockOut <= nextClockIn) {
      throw new BadRequestException('Fyraften skal være efter mødetid');
    }

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

    const payrollPeriod = existingEntry.payrollPeriodId
      ? await this.prisma.payrollPeriod.findUnique({
          where: { id: existingEntry.payrollPeriodId },
        })
      : await this.payrollService.getPayrollPeriodEntityForDate(
          existingEntry.cinemaId,
          existingEntry.clockIn,
        );

    if (payrollPeriod?.status === 'EXPORTED') {
      const adjustmentPayrollPeriod =
        await this.payrollService.getCurrentPayrollPeriodEntity(
          existingEntry.cinemaId,
        );

      const exportedMinutes = getEntryMinutes(existingEntry);
      const adjustedMinutes = getEntryMinutes(entry);

      await createOrUpdateTimeEntryPayrollAdjustment(this.prisma, {
        timeEntry: entry,
        originalPayrollPeriodId: payrollPeriod.id,
        settlementPayrollPeriodId: adjustmentPayrollPeriod?.id ?? null,
        type: 'EDIT_AFTER_EXPORT',
        exportedMinutes,
        adjustedMinutes,
        reason: `Tidsregistrering rettet efter eksport. Tidligere registreret: ${formatSignedDuration(
          exportedMinutes,
        ).replace('+', '')}. Ny registrering: ${formatSignedDuration(
          adjustedMinutes,
        ).replace('+', '')}. Efterregulering: ${formatSignedDuration(
          adjustedMinutes - exportedMinutes,
        )}. Årsag: ${data.adminNote}`,
        changedByUserId: user?.sub ?? null,
      });
    }

    await createTimeEntryRevision(this.prisma, {
      timeEntryId: entry.id,
      changedByUserId: user?.sub ?? null,
      action: 'UPDATED',
      before: {
        status: existingEntry.status,
        clockIn: existingEntry.clockIn,
        clockOut: existingEntry.clockOut,
        note: existingEntry.note,
        adminNote: existingEntry.adminNote,
        clockInNote: existingEntry.clockInNote,
        clockOutNote: existingEntry.clockOutNote,
      },
      after: {
        status: entry.status,
        clockIn: entry.clockIn,
        clockOut: entry.clockOut,
        note: entry.note,
        adminNote: entry.adminNote,
        clockInNote: entry.clockInNote,
        clockOutNote: entry.clockOutNote,
      },
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
