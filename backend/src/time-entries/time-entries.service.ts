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
  getCinemaDeviationSelect,
  getEntryMinutes,
  hasText,
  requiresClockInDeviationNote,
  requiresClockOutDeviationNote,
  requiresGeneralDeviationNote,
  withTimeEntryDeviation,
} from './helpers/time-entry-deviation';
import {
  ensureTimeEntryEditable,
  ensureUserCanAccessTimeEntry,
  getTimeEntryCinemaFilter,
} from './helpers/time-entry-access';
import { createTimeEntryRevision } from './helpers/time-entry-revisions';

@Injectable()
export class TimeEntriesService {
  private readonly shiftMatchBeforeMinutes = 120;
  private readonly shiftMatchAfterMinutes = 240;

  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
    private auditLogsService: AuditLogsService,
    private readonly payrollService: PayrollService,
  ) {}

  private getPayrollAdjustmentExportCategory(entry: any) {
    if (entry.user?.employmentType === 'SALARIED') {
      return 'SALARIED';
    }

    return 'HOURLY';
  }

  private async createPayrollAdjustmentRevision(params: {
    payrollAdjustmentId: number;
    changedByUserId?: number | null;
    action: 'CREATED' | 'UPDATED' | 'INCLUDED' | 'VOIDED';
    before?: any | null;
    after?: any | null;
    reason?: string | null;
  }) {
    return this.prisma.payrollAdjustmentRevision.create({
      data: {
        payrollAdjustmentId: params.payrollAdjustmentId,
        changedByUserId: params.changedByUserId ?? null,
        action: params.action,

        previousStatus: params.before?.status ?? null,
        newStatus: params.after?.status ?? null,

        previousExportedMinutes: params.before?.exportedMinutes ?? null,
        newExportedMinutes: params.after?.exportedMinutes ?? null,

        previousAdjustedMinutes: params.before?.adjustedMinutes ?? null,
        newAdjustedMinutes: params.after?.adjustedMinutes ?? null,

        previousMinutesDelta: params.before?.minutesDelta ?? null,
        newMinutesDelta: params.after?.minutesDelta ?? null,

        previousOriginalPayrollPeriodId:
          params.before?.originalPayrollPeriodId ?? null,
        newOriginalPayrollPeriodId:
          params.after?.originalPayrollPeriodId ?? null,

        previousSettlementPayrollPeriodId:
          params.before?.settlementPayrollPeriodId ?? null,
        newSettlementPayrollPeriodId:
          params.after?.settlementPayrollPeriodId ?? null,

        reason: params.reason ?? null,
      },
    });
  }

  private async createOrUpdatePayrollAdjustment(params: {
    timeEntry: any;
    originalPayrollPeriodId: number;
    settlementPayrollPeriodId?: number | null;
    type:
      | 'APPROVAL_AFTER_EXPORT'
      | 'EDIT_AFTER_EXPORT'
      | 'MANUAL_ENTRY_IN_EXPORTED_PERIOD';
    exportedMinutes: number;
    adjustedMinutes: number;
    reason: string;
    changedByUserId?: number | null;
  }) {
    const existingPendingAdjustment =
      await this.prisma.payrollAdjustment.findFirst({
        where: {
          timeEntryId: params.timeEntry.id,
          status: 'PENDING',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

    const exportedMinutes = existingPendingAdjustment
      ? existingPendingAdjustment.exportedMinutes
      : params.exportedMinutes;
    const adjustedMinutes = params.adjustedMinutes;
    const minutesDelta = adjustedMinutes - exportedMinutes;

    if (minutesDelta === 0) {
      if (!existingPendingAdjustment) {
        return null;
      }

      const voidedAdjustment = await this.prisma.payrollAdjustment.update({
        where: { id: existingPendingAdjustment.id },
        data: {
          status: 'VOIDED',
          adjustedMinutes,
          minutesDelta,
          reason: params.reason,
          voidedAt: new Date(),
        },
      });

      await this.createPayrollAdjustmentRevision({
        payrollAdjustmentId: voidedAdjustment.id,
        changedByUserId: params.changedByUserId ?? null,
        action: 'VOIDED',
        before: existingPendingAdjustment,
        after: voidedAdjustment,
        reason: params.reason,
      });

      return voidedAdjustment;
    }

    if (existingPendingAdjustment) {
      const updatedAdjustment = await this.prisma.payrollAdjustment.update({
        where: { id: existingPendingAdjustment.id },
        data: {
          settlementPayrollPeriodId: params.settlementPayrollPeriodId ?? null,
          payrollTypeId: params.timeEntry.payrollTypeId ?? null,
          type: params.type,
          exportCategory: this.getPayrollAdjustmentExportCategory(
            params.timeEntry,
          ),
          adjustedMinutes,
          minutesDelta,
          previousMinutes: existingPendingAdjustment.adjustedMinutes,
          newMinutes: adjustedMinutes,
          previousClockIn: existingPendingAdjustment.newClockIn,
          previousClockOut: existingPendingAdjustment.newClockOut,
          newClockIn: params.timeEntry.clockIn,
          newClockOut: params.timeEntry.clockOut,
          reason: params.reason,
          voidedAt: null,
        },
      });

      await this.createPayrollAdjustmentRevision({
        payrollAdjustmentId: updatedAdjustment.id,
        changedByUserId: params.changedByUserId ?? null,
        action: 'UPDATED',
        before: existingPendingAdjustment,
        after: updatedAdjustment,
        reason: params.reason,
      });

      return updatedAdjustment;
    }

    const adjustment = await this.prisma.payrollAdjustment.create({
      data: {
        cinemaId: params.timeEntry.cinemaId,
        userId: params.timeEntry.userId,
        timeEntryId: params.timeEntry.id,
        originalPayrollPeriodId: params.originalPayrollPeriodId,
        settlementPayrollPeriodId: params.settlementPayrollPeriodId ?? null,
        payrollTypeId: params.timeEntry.payrollTypeId ?? null,
        type: params.type,
        status: 'PENDING',
        exportCategory: this.getPayrollAdjustmentExportCategory(
          params.timeEntry,
        ),
        minutesDelta,
        exportedMinutes,
        adjustedMinutes,
        previousMinutes: exportedMinutes,
        newMinutes: adjustedMinutes,
        previousClockIn: null,
        previousClockOut: null,
        newClockIn: params.timeEntry.clockIn,
        newClockOut: params.timeEntry.clockOut,
        reason: params.reason,
        createdByUserId: params.changedByUserId ?? null,
      },
    });

    await this.createPayrollAdjustmentRevision({
      payrollAdjustmentId: adjustment.id,
      changedByUserId: params.changedByUserId ?? null,
      action: 'CREATED',
      before: null,
      after: adjustment,
      reason: params.reason,
    });

    return adjustment;
  }

  private async findMatchingShiftForClockIn(data: {
    userId: number;
    cinemaId: number;
    clockIn: Date;
  }) {
    const from = new Date(
      data.clockIn.getTime() - this.shiftMatchBeforeMinutes * 60000,
    );
    const to = new Date(
      data.clockIn.getTime() + this.shiftMatchAfterMinutes * 60000,
    );

    return this.prisma.shift.findFirst({
      where: {
        userId: data.userId,
        cinemaId: data.cinemaId,
        startTime: {
          lte: to,
        },
        endTime: {
          gte: from,
        },
      },
      include: {
        workType: true,
        cinema: {
          select: getCinemaDeviationSelect(),
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

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
      include: {
        user: true,
        payrollType: true,
        cinema: {
          select: getCinemaDeviationSelect(),
        },
        shift: {
          include: {
            workType: {
              include: {
                payrollType: true,
              },
            },
          },
        },
      },
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
        user: true,
        payrollType: true,
        payrollAdjustments: {
          where: {
            status: 'PENDING',
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        cinema: {
          select: getCinemaDeviationSelect(),
        },
        shift: {
          include: {
            workType: {
              include: {
                payrollType: true,
              },
            },
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
      include: {
        cinema: {
          select: getCinemaDeviationSelect(),
        },
        shift: {
          include: {
            workType: true,
          },
        },
      },
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
          include: {
            workType: true,
            cinema: {
              select: getCinemaDeviationSelect(),
            },
          },
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

      if (
        deviation.requiresNote &&
        requiresClockInDeviationNote(deviation) &&
        !hasText(clockInNote)
      ) {
        throw new BadRequestException(
          'Du skal skrive en mødetidsnote, når mødetiden afviger fra vagtplanen',
        );
      }

      if (
        deviation.requiresNote &&
        requiresClockOutDeviationNote(deviation) &&
        !hasText(clockOutNote)
      ) {
        throw new BadRequestException(
          'Du skal skrive en fyraftensnote, når fyraften afviger fra vagtplanen',
        );
      }

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
      include: {
        user: true,
        payrollType: true,
        cinema: {
          select: getCinemaDeviationSelect(),
        },
        shift: {
          include: {
            workType: {
              include: {
                payrollType: true,
              },
            },
          },
        },
      },
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
      shift = await this.findMatchingShiftForClockIn({
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
      include: {
        user: true,
        payrollType: true,
        cinema: {
          select: getCinemaDeviationSelect(),
        },
        shift: {
          include: {
            workType: {
              include: {
                payrollType: true,
              },
            },
          },
        },
      },
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
      include: {
        cinema: {
          select: getCinemaDeviationSelect(),
        },
        shift: true,
      },
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
      include: {
        user: true,
        payrollType: true,
        cinema: {
          select: getCinemaDeviationSelect(),
        },
        shift: {
          include: {
            workType: {
              include: {
                payrollType: true,
              },
            },
          },
        },
      },
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
      include: {
        user: true,
        cinema: {
          select: getCinemaDeviationSelect(),
        },
        shift: true,
      },
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

    if (
      deviation.requiresNote &&
      !hasText(existingEntry.clockInNote) &&
      !hasText(existingEntry.clockOutNote) &&
      !hasText(existingEntry.note)
    ) {
      throw new BadRequestException(
        'Tidsregistreringen har afvigelser og kræver en medarbejder-note før godkendelse',
      );
    }

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
      include: {
        user: true,
        payrollType: true,
        cinema: {
          select: getCinemaDeviationSelect(),
        },
        shift: {
          include: {
            workType: {
              include: {
                payrollType: true,
              },
            },
          },
        },
      },
    });

    if (payrollPeriod?.status === 'EXPORTED' && confirmPayrollAdjustment) {
      const adjustedMinutes = getEntryMinutes(entry);

      await this.createOrUpdatePayrollAdjustment({
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
      include: {
        user: true,
        cinema: {
          select: getCinemaDeviationSelect(),
        },
      },
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
      include: {
        user: true,
        payrollType: true,
        cinema: {
          select: getCinemaDeviationSelect(),
        },
        shift: {
          include: {
            workType: {
              include: {
                payrollType: true,
              },
            },
          },
        },
      },
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
      include: {
        user: true,
        cinema: {
          select: getCinemaDeviationSelect(),
        },
      },
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
      include: {
        user: true,
        payrollType: true,
        cinema: {
          select: getCinemaDeviationSelect(),
        },
        shift: {
          include: {
            workType: {
              include: {
                payrollType: true,
              },
            },
          },
        },
      },
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
      include: {
        user: true,
        cinema: {
          select: getCinemaDeviationSelect(),
        },
      },
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
      include: {
        user: true,
        payrollType: true,
        cinema: {
          select: getCinemaDeviationSelect(),
        },
        shift: {
          include: {
            workType: {
              include: {
                payrollType: true,
              },
            },
          },
        },
      },
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

      await this.createOrUpdatePayrollAdjustment({
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
      include: {
        user: true,
        cinema: {
          select: getCinemaDeviationSelect(),
        },
        shift: true,
      },
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

    const oldClockIn = existingEntry.clockIn;
    const oldClockOut = existingEntry.clockOut;
    const oldClockInNote = existingEntry.clockInNote;
    const oldClockOutNote = existingEntry.clockOutNote;

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

    if (
      deviation.requiresNote &&
      requiresClockInDeviationNote(deviation) &&
      !hasText(newClockInNote)
    ) {
      throw new BadRequestException(
        'Du skal skrive en mødetidsnote, når mødetiden afviger fra vagtplanen',
      );
    }

    if (
      deviation.requiresNote &&
      requiresClockOutDeviationNote(deviation) &&
      !hasText(newClockOutNote)
    ) {
      throw new BadRequestException(
        'Du skal skrive en fyraftensnote, når fyraften afviger fra vagtplanen',
      );
    }

    if (
      deviation.requiresNote &&
      requiresGeneralDeviationNote(deviation) &&
      !hasText(newClockInNote) &&
      !hasText(newClockOutNote)
    ) {
      throw new BadRequestException(
        'Du skal skrive en note, når tiderne afviger fra vagtplanen',
      );
    }

    const changes: string[] = [];

    if (oldClockIn.getTime() !== newClockIn.getTime()) {
      changes.push(
        `Mødetid: ${oldClockIn.toLocaleString('da-DK')} → ${newClockIn.toLocaleString('da-DK')}`,
      );
    }

    if ((oldClockOut?.getTime() ?? null) !== (newClockOut?.getTime() ?? null)) {
      changes.push(
        `Fyraften: ${
          oldClockOut ? oldClockOut.toLocaleString('da-DK') : '-'
        } → ${newClockOut ? newClockOut.toLocaleString('da-DK') : '-'}`,
      );
    }

    if ((oldClockInNote ?? '') !== (newClockInNote ?? '')) {
      changes.push('Mødetidsnote ændret');
    }

    if ((oldClockOutNote ?? '') !== (newClockOutNote ?? '')) {
      changes.push('Fyraftensnote ændret');
    }

    if (existingEntry.status !== 'PENDING') {
      changes.push(`Status: ${existingEntry.status} → PENDING`);
    }

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
      include: {
        user: true,
        payrollType: true,
        cinema: {
          select: getCinemaDeviationSelect(),
        },
        shift: {
          include: {
            workType: {
              include: {
                payrollType: true,
              },
            },
          },
        },
      },
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

      await this.createOrUpdatePayrollAdjustment({
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
      include: {
        user: true,
        cinema: {
          select: getCinemaDeviationSelect(),
        },
        shift: true,
      },
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

    if (
      deviation.requiresNote &&
      requiresClockInDeviationNote(deviation) &&
      !hasText(nextClockInNote) &&
      !hasText(data.adminNote)
    ) {
      throw new BadRequestException(
        'Mødetidsnote eller admin-note er påkrævet, når mødetiden afviger fra vagtplanen',
      );
    }

    if (
      deviation.requiresNote &&
      requiresClockOutDeviationNote(deviation) &&
      !hasText(nextClockOutNote) &&
      !hasText(data.adminNote)
    ) {
      throw new BadRequestException(
        'Fyraftensnote eller admin-note er påkrævet, når fyraften afviger fra vagtplanen',
      );
    }

    const changes: string[] = [];

    if (existingEntry.clockIn.getTime() !== nextClockIn.getTime()) {
      changes.push(
        `Mødetid ændret fra ${existingEntry.clockIn.toLocaleString('da-DK')} til ${nextClockIn.toLocaleString('da-DK')}`,
      );
    }

    if (
      (existingEntry.clockOut?.getTime() ?? null) !==
      (nextClockOut?.getTime() ?? null)
    ) {
      changes.push(
        `Fyraften ændret fra ${
          existingEntry.clockOut
            ? existingEntry.clockOut.toLocaleString('da-DK')
            : '-'
        } til ${nextClockOut ? nextClockOut.toLocaleString('da-DK') : '-'}`,
      );
    }

    if (
      data.clockInNote !== undefined &&
      data.clockInNote !== existingEntry.clockInNote
    ) {
      changes.push(
        `Mødetidsnote ændret fra "${
          existingEntry.clockInNote ?? '-'
        }" til "${data.clockInNote ?? '-'}"`,
      );
    }

    if (
      data.clockOutNote !== undefined &&
      data.clockOutNote !== existingEntry.clockOutNote
    ) {
      changes.push(
        `Fyraftensnote ændret fra "${
          existingEntry.clockOutNote ?? '-'
        }" til "${data.clockOutNote ?? '-'}"`,
      );
    }

    if (
      data.adminNote !== undefined &&
      data.adminNote !== existingEntry.adminNote
    ) {
      changes.push(
        `Admin-note ændret fra "${
          existingEntry.adminNote ?? '-'
        }" til "${data.adminNote ?? '-'}"`,
      );
    }

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
      include: {
        user: true,
        payrollType: true,
        cinema: {
          select: getCinemaDeviationSelect(),
        },
        shift: {
          include: {
            workType: {
              include: {
                payrollType: true,
              },
            },
          },
        },
      },
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

      await this.createOrUpdatePayrollAdjustment({
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
