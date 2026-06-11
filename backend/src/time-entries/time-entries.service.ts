import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

type TimeEntryDeviationType =
  | 'NONE'
  | 'OPEN_ENTRY'
  | 'MANUAL_WITHOUT_SHIFT'
  | 'EARLY_CLOCK_IN'
  | 'LATE_CLOCK_IN'
  | 'EARLY_CLOCK_OUT'
  | 'LATE_CLOCK_OUT'
  | 'TIME_DIFFERENCE';

type TimeEntryDeviation = {
  hasDeviation: boolean;
  requiresNote: boolean;
  types: TimeEntryDeviationType[];
  plannedMinutes: number | null;
  registeredMinutes: number | null;
  differenceMinutes: number | null;
  clockInDeviationMinutes: number | null;
  clockOutDeviationMinutes: number | null;
  messages: string[];
};

type TimeEntryDeviationSettings = {
  clockInDeviationToleranceMinutes?: number | null;
  clockOutDeviationToleranceMinutes?: number | null;
  requireNoteForClockInDeviation?: boolean | null;
  requireNoteForClockOutDeviation?: boolean | null;
  requireNoteForManualEntry?: boolean | null;
};

@Injectable()
export class TimeEntriesService {
  private readonly deviationGraceMinutes = 5;
  private readonly shiftMatchBeforeMinutes = 120;
  private readonly shiftMatchAfterMinutes = 240;

  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
    private auditLogsService: AuditLogsService,
  ) {}

  private async createRevision(params: {
    timeEntryId: number;
    changedByUserId?: number | null;
    action: string;
    before?: {
      status?: any;
      clockIn?: Date | string | null;
      clockOut?: Date | string | null;
      note?: string | null;
      clockInNote?: string | null;
      clockOutNote?: string | null;
      adminNote?: string | null;
    } | null;
    after?: {
      status?: any;
      clockIn?: Date | string | null;
      clockOut?: Date | string | null;
      note?: string | null;
      clockInNote?: string | null;
      clockOutNote?: string | null;
      adminNote?: string | null;
    } | null;
    reason?: string | null;
  }) {
    return this.prisma.timeEntryRevision.create({
      data: {
        timeEntryId: params.timeEntryId,
        changedByUserId: params.changedByUserId ?? null,
        action: params.action,

        previousStatus: params.before?.status ?? null,
        newStatus: params.after?.status ?? null,

        previousClockIn: params.before?.clockIn
          ? new Date(params.before.clockIn)
          : null,
        newClockIn: params.after?.clockIn
          ? new Date(params.after.clockIn)
          : null,

        previousClockOut: params.before?.clockOut
          ? new Date(params.before.clockOut)
          : null,
        newClockOut: params.after?.clockOut
          ? new Date(params.after.clockOut)
          : null,

        previousNote: params.before?.note ?? null,
        newNote: params.after?.note ?? null,

        previousClockInNote: params.before?.clockInNote ?? null,
        newClockInNote: params.after?.clockInNote ?? null,

        previousClockOutNote: params.before?.clockOutNote ?? null,
        newClockOutNote: params.after?.clockOutNote ?? null,

        previousAdminNote: params.before?.adminNote ?? null,
        newAdminNote: params.after?.adminNote ?? null,

        reason: params.reason ?? null,
      },
    });
  }

  private getCinemaFilter(user?: any) {
    if (!user || user.role === 'MASTER') {
      return {};
    }

    return {
      cinemaId: user.cinemaId,
    };
  }

  private ensureEntryEditable(entry: any, user?: any) {
    if (!entry.payrollLocked) {
      return;
    }

    if (user?.role === 'MASTER' && entry.payrollUnlockedByMaster) {
      return;
    }

    throw new BadRequestException(
      'Denne tidsregistrering er låst af lønsystemet',
    );
  }

  private minutesBetween(start: Date, end: Date) {
    return Math.round((end.getTime() - start.getTime()) / 60000);
  }

  private hasText(value?: string | null) {
    return Boolean(value && value.trim() !== '');
  }

  private requiresClockInDeviationNote(deviation: TimeEntryDeviation) {
    return deviation.types.some(
      (type) => type === 'EARLY_CLOCK_IN' || type === 'LATE_CLOCK_IN',
    );
  }

  private requiresClockOutDeviationNote(deviation: TimeEntryDeviation) {
    return deviation.types.some(
      (type) => type === 'EARLY_CLOCK_OUT' || type === 'LATE_CLOCK_OUT',
    );
  }

  private requiresGeneralDeviationNote(deviation: TimeEntryDeviation) {
    return deviation.types.some(
      (type) => type === 'TIME_DIFFERENCE' || type === 'MANUAL_WITHOUT_SHIFT',
    );
  }

  private analyzeDeviation(
    entry: any,
    settings?: TimeEntryDeviationSettings | null,
  ): TimeEntryDeviation {
    const messages: string[] = [];
    const types: TimeEntryDeviationType[] = [];

    const shift = entry.shift;

    const clockInTolerance =
      settings?.clockInDeviationToleranceMinutes ??
      entry.cinema?.clockInDeviationToleranceMinutes ??
      this.deviationGraceMinutes;

    const clockOutTolerance =
      settings?.clockOutDeviationToleranceMinutes ??
      entry.cinema?.clockOutDeviationToleranceMinutes ??
      this.deviationGraceMinutes;

    const requireNoteForClockInDeviation =
      settings?.requireNoteForClockInDeviation ??
      entry.cinema?.requireNoteForClockInDeviation ??
      true;

    const requireNoteForClockOutDeviation =
      settings?.requireNoteForClockOutDeviation ??
      entry.cinema?.requireNoteForClockOutDeviation ??
      true;

    const requireNoteForManualEntry =
      settings?.requireNoteForManualEntry ??
      entry.cinema?.requireNoteForManualEntry ??
      true;

    if (!entry.clockOut) {
      return {
        hasDeviation: true,
        requiresNote: false,
        types: ['OPEN_ENTRY'],
        plannedMinutes: shift
          ? this.minutesBetween(shift.startTime, shift.endTime)
          : null,
        registeredMinutes: null,
        differenceMinutes: null,
        clockInDeviationMinutes: shift
          ? this.minutesBetween(shift.startTime, entry.clockIn)
          : null,
        clockOutDeviationMinutes: null,
        messages: ['Tidsregistreringen er stadig åben'],
      };
    }

    if (!shift) {
      return {
        hasDeviation: true,
        requiresNote: requireNoteForManualEntry,
        types: ['MANUAL_WITHOUT_SHIFT'],
        plannedMinutes: null,
        registeredMinutes: this.minutesBetween(entry.clockIn, entry.clockOut),
        differenceMinutes: null,
        clockInDeviationMinutes: null,
        clockOutDeviationMinutes: null,
        messages: ['Tidsregistreringen er ikke tilknyttet en planlagt vagt'],
      };
    }

    const plannedMinutes = this.minutesBetween(shift.startTime, shift.endTime);
    const registeredMinutes = this.minutesBetween(
      entry.clockIn,
      entry.clockOut,
    );
    const differenceMinutes = registeredMinutes - plannedMinutes;
    const clockInDeviationMinutes = this.minutesBetween(
      shift.startTime,
      entry.clockIn,
    );
    const clockOutDeviationMinutes = this.minutesBetween(
      shift.endTime,
      entry.clockOut,
    );

    if (clockInDeviationMinutes > clockInTolerance) {
      types.push('LATE_CLOCK_IN');
      messages.push(`Mødt ${clockInDeviationMinutes} minutter for sent`);
    }

    if (clockInDeviationMinutes < -clockInTolerance) {
      types.push('EARLY_CLOCK_IN');
      messages.push(
        `Mødt ${Math.abs(clockInDeviationMinutes)} minutter før planlagt`,
      );
    }

    if (clockOutDeviationMinutes < -clockOutTolerance) {
      types.push('EARLY_CLOCK_OUT');
      messages.push(
        `Gået ${Math.abs(clockOutDeviationMinutes)} minutter før planlagt`,
      );
    }

    if (clockOutDeviationMinutes > clockOutTolerance) {
      types.push('LATE_CLOCK_OUT');
      messages.push(`Gået ${clockOutDeviationMinutes} minutter efter planlagt`);
    }

    if (
      types.length === 0 &&
      Math.abs(differenceMinutes) >
        Math.max(clockInTolerance, clockOutTolerance)
    ) {
      types.push('TIME_DIFFERENCE');
      messages.push(
        `Registreret tid afviger med ${differenceMinutes} minutter fra vagtplanen`,
      );
    }

    if (types.length === 0) {
      types.push('NONE');
      messages.push('Ingen væsentlig afvigelse');
    }

    const hasDeviation = types.some((type) => type !== 'NONE');

    const requiresNote =
      (types.some(
        (type) => type === 'EARLY_CLOCK_IN' || type === 'LATE_CLOCK_IN',
      ) &&
        requireNoteForClockInDeviation) ||
      (types.some(
        (type) => type === 'EARLY_CLOCK_OUT' || type === 'LATE_CLOCK_OUT',
      ) &&
        requireNoteForClockOutDeviation) ||
      (types.includes('TIME_DIFFERENCE') &&
        (requireNoteForClockInDeviation || requireNoteForClockOutDeviation));

    return {
      hasDeviation,
      requiresNote,
      types,
      plannedMinutes,
      registeredMinutes,
      differenceMinutes,
      clockInDeviationMinutes,
      clockOutDeviationMinutes,
      messages,
    };
  }

  private withDeviation(entry: any) {
    return {
      ...entry,
      deviation: this.analyzeDeviation(entry, entry.cinema),
    };
  }

  private getCinemaDeviationSelect() {
    return {
      clockInDeviationToleranceMinutes: true,
      clockOutDeviationToleranceMinutes: true,
      requireNoteForClockInDeviation: true,
      requireNoteForClockOutDeviation: true,
      requireNoteForManualEntry: true,
    };
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
          select: this.getCinemaDeviationSelect(),
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  async findForUser(userId: number) {
    const entries = await this.prisma.timeEntry.findMany({
      where: { userId },
      include: {
        user: true,
        payrollType: true,
        cinema: {
          select: this.getCinemaDeviationSelect(),
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

    return entries.map((entry) => this.withDeviation(entry));
  }

  async findAll(user?: any) {
    const entries = await this.prisma.timeEntry.findMany({
      where:
        user?.role === 'EMPLOYEE'
          ? {
              userId: user.sub,
              ...this.getCinemaFilter(user),
            }
          : this.getCinemaFilter(user),
      include: {
        user: true,
        payrollType: true,
        cinema: {
          select: this.getCinemaDeviationSelect(),
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

    return entries.map((entry) => this.withDeviation(entry));
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
          select: this.getCinemaDeviationSelect(),
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

    const shift = data.shiftId
      ? await this.prisma.shift.findFirst({
          where: {
            id: data.shiftId,
            cinemaId: data.cinemaId,
          },
          include: {
            workType: true,
            cinema: {
              select: this.getCinemaDeviationSelect(),
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
      const deviation = this.analyzeDeviation(
        {
          clockIn,
          clockOut,
          shift,
        },
        shift.cinema,
      );

      if (
        deviation.requiresNote &&
        this.requiresClockInDeviationNote(deviation) &&
        !this.hasText(clockInNote)
      ) {
        throw new BadRequestException(
          'Du skal skrive en mødetidsnote, når mødetiden afviger fra vagtplanen',
        );
      }

      if (
        deviation.requiresNote &&
        this.requiresClockOutDeviationNote(deviation) &&
        !this.hasText(clockOutNote)
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
          select: this.getCinemaDeviationSelect(),
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

    await this.createRevision({
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

    const response = this.withDeviation(entry);

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
      return this.withDeviation(openEntry);
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
          select: this.getCinemaDeviationSelect(),
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

    await this.createRevision({
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

    const response = this.withDeviation(entry);

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
          select: this.getCinemaDeviationSelect(),
        },
        shift: true,
      },
    });

    if (!existingEntry) {
      throw new NotFoundException('Tidsregistrering blev ikke fundet');
    }

    this.ensureEntryEditable(existingEntry);

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
          select: this.getCinemaDeviationSelect(),
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

    const response = this.withDeviation(entry);

    this.realtimeGateway.notifyCinema(
      entry.cinemaId,
      'timeEntriesUpdated',
      response,
    );

    return response;
  }

  async approveEntry(id: number, changedByUserId?: number | null) {
    const existingEntry = await this.prisma.timeEntry.findUnique({
      where: { id },
      include: {
        user: true,
        cinema: {
          select: this.getCinemaDeviationSelect(),
        },
        shift: true,
      },
    });

    if (!existingEntry) {
      throw new NotFoundException('Tidsregistrering blev ikke fundet');
    }

    this.ensureEntryEditable(existingEntry);

    if (existingEntry.status === 'VOIDED') {
      throw new BadRequestException(
        'En annulleret tidsregistrering kan ikke godkendes',
      );
    }

    const deviation = this.analyzeDeviation(
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
      !this.hasText(existingEntry.clockInNote) &&
      !this.hasText(existingEntry.clockOutNote) &&
      !this.hasText(existingEntry.note)
    ) {
      throw new BadRequestException(
        'Tidsregistreringen har afvigelser og kræver en medarbejder-note før godkendelse',
      );
    }

    const entry = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        status: 'APPROVED',
      },
      include: {
        user: true,
        payrollType: true,
        cinema: {
          select: this.getCinemaDeviationSelect(),
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

    await this.createRevision({
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

    const response = this.withDeviation(entry);

    this.realtimeGateway.notifyCinema(
      entry.cinemaId,
      'timeEntriesUpdated',
      response,
    );

    return response;
  }

  async unapproveEntry(id: number, changedByUserId?: number | null) {
    const existingEntry = await this.prisma.timeEntry.findUnique({
      where: { id },
      include: {
        user: true,
        cinema: {
          select: this.getCinemaDeviationSelect(),
        },
      },
    });

    if (!existingEntry) {
      throw new NotFoundException('Tidsregistrering blev ikke fundet');
    }

    this.ensureEntryEditable(existingEntry);

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
          select: this.getCinemaDeviationSelect(),
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

    await this.createRevision({
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

    const response = this.withDeviation(entry);

    this.realtimeGateway.notifyCinema(
      entry.cinemaId,
      'timeEntriesUpdated',
      response,
    );

    return response;
  }

  async rejectEntry(
    id: number,
    adminNote?: string,
    changedByUserId?: number | null,
  ) {
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
          select: this.getCinemaDeviationSelect(),
        },
      },
    });

    if (!existingEntry) {
      throw new NotFoundException('Tidsregistrering blev ikke fundet');
    }

    this.ensureEntryEditable(existingEntry);

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
          select: this.getCinemaDeviationSelect(),
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

    await this.createRevision({
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

    const response = this.withDeviation(entry);

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
          select: this.getCinemaDeviationSelect(),
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

    this.ensureEntryEditable(existingEntry, user);

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

    const deviation = this.analyzeDeviation(
      {
        ...existingEntry,
        clockIn: newClockIn,
        clockOut: newClockOut,
      },
      existingEntry.cinema,
    );

    if (
      deviation.requiresNote &&
      this.requiresClockInDeviationNote(deviation) &&
      !this.hasText(newClockInNote)
    ) {
      throw new BadRequestException(
        'Du skal skrive en mødetidsnote, når mødetiden afviger fra vagtplanen',
      );
    }

    if (
      deviation.requiresNote &&
      this.requiresClockOutDeviationNote(deviation) &&
      !this.hasText(newClockOutNote)
    ) {
      throw new BadRequestException(
        'Du skal skrive en fyraftensnote, når fyraften afviger fra vagtplanen',
      );
    }

    if (
      deviation.requiresNote &&
      this.requiresGeneralDeviationNote(deviation) &&
      !this.hasText(newClockInNote) &&
      !this.hasText(newClockOutNote)
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
          select: this.getCinemaDeviationSelect(),
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

    await this.createRevision({
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

    const response = this.withDeviation(entry);

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
  ) {
    const existingEntry = await this.prisma.timeEntry.findUnique({
      where: { id },
      include: {
        user: true,
        cinema: {
          select: this.getCinemaDeviationSelect(),
        },
        shift: true,
      },
    });

    if (!existingEntry) {
      throw new NotFoundException('Tidsregistrering blev ikke fundet');
    }

    this.ensureEntryEditable(existingEntry, user);

    if (!this.hasText(data.adminNote)) {
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

    const deviation = this.analyzeDeviation(
      {
        ...existingEntry,
        clockIn: nextClockIn,
        clockOut: nextClockOut,
      },
      existingEntry.cinema,
    );

    if (
      deviation.requiresNote &&
      this.requiresClockInDeviationNote(deviation) &&
      !this.hasText(nextClockInNote) &&
      !this.hasText(data.adminNote)
    ) {
      throw new BadRequestException(
        'Mødetidsnote eller admin-note er påkrævet, når mødetiden afviger fra vagtplanen',
      );
    }

    if (
      deviation.requiresNote &&
      this.requiresClockOutDeviationNote(deviation) &&
      !this.hasText(nextClockOutNote) &&
      !this.hasText(data.adminNote)
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

    if (existingEntry.status !== 'PENDING') {
      changes.push(`Status: ${existingEntry.status} → PENDING`);
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
        status: 'PENDING',
      },
      include: {
        user: true,
        payrollType: true,
        cinema: {
          select: this.getCinemaDeviationSelect(),
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

    await this.createRevision({
      timeEntryId: entry.id,
      changedByUserId: user.sub,
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
        userId: user.sub,
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
      userId: user.sub,
      cinemaId: entry.cinemaId,
    });

    const response = this.withDeviation(entry);

    this.realtimeGateway.notifyCinema(
      entry.cinemaId,
      'timeEntriesUpdated',
      response,
    );

    return response;
  }

  async findRevisionsForEntry(user: any, id: number) {
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

    if (user.role !== 'MASTER' && entry.cinemaId !== user.cinemaId) {
      throw new BadRequestException(
        'Du kan kun se historik for din egen biograf',
      );
    }

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
