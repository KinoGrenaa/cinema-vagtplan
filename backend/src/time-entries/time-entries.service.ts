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
    shiftId: number;
    clockIn: string;
    clockOut: string;
    note?: string;
  }) {
    const shift = await this.prisma.shift.findFirst({
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
    });

    if (!shift) {
      throw new BadRequestException('Vagten blev ikke fundet');
    }

    if (shift.userId !== data.userId) {
      throw new BadRequestException(
        'Du kan kun indsende timer for dine egne vagter',
      );
    }

    const clockIn = new Date(data.clockIn);
    const clockOut = new Date(data.clockOut);

    if (Number.isNaN(clockIn.getTime()) || Number.isNaN(clockOut.getTime())) {
      throw new BadRequestException('Ugyldig mødetid eller fyraften');
    }

    if (clockOut <= clockIn) {
      throw new BadRequestException('Fyraften skal være efter mødetid');
    }

    const deviation = this.analyzeDeviation(
      {
        clockIn,
        clockOut,
        shift,
      },
      shift.cinema,
    );

    if (deviation.requiresNote && !this.hasText(data.note)) {
      throw new BadRequestException(
        'Du skal skrive en note, når tiderne afviger fra vagtplanen',
      );
    }

    const existingEntry = await this.prisma.timeEntry.findFirst({
      where: {
        userId: data.userId,
        shiftId: data.shiftId,
        cinemaId: data.cinemaId,
      },
    });

    if (existingEntry) {
      throw new BadRequestException(
        'Der er allerede indsendt timer for denne vagt',
      );
    }

    const entry = await this.prisma.timeEntry.create({
      data: {
        userId: data.userId,
        cinemaId: data.cinemaId,
        shiftId: data.shiftId,
        payrollTypeId: shift.workType?.payrollTypeId || null,
        clockIn,
        clockOut,
        note: data.note,
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

    await this.auditLogsService.create({
      action: 'SUBMIT_MANUAL_TIME_ENTRY',
      entityType: 'TimeEntry',
      entityId: entry.id,
      description: 'Medarbejder indsendte manuel tidsregistrering',
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

    const entry = await this.prisma.timeEntry.create({
      data: {
        userId: data.userId,
        cinemaId: data.cinemaId,
        shiftId: shift?.id || null,
        payrollTypeId: shift?.workType?.payrollTypeId || null,
        clockIn,
        note: data.note?.trim() || null,
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

  async approveEntry(id: number) {
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

    const deviation = this.analyzeDeviation(
      existingEntry,
      existingEntry.cinema,
    );

    if (deviation.types.includes('OPEN_ENTRY')) {
      throw new BadRequestException(
        'En åben tidsregistrering kan ikke godkendes',
      );
    }

    if (deviation.requiresNote && !this.hasText(existingEntry.note)) {
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

    await this.auditLogsService.create({
      action: 'APPROVE_TIME_ENTRY',
      entityType: 'TimeEntry',
      entityId: entry.id,
      description: `Godkendte tidsregistrering for ${existingEntry.user.firstName} ${existingEntry.user.lastName}`,
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

  async unapproveEntry(id: number) {
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

    await this.auditLogsService.create({
      action: 'UNAPPROVE_TIME_ENTRY',
      entityType: 'TimeEntry',
      entityId: entry.id,
      description: `Fjernede godkendelse af tidsregistrering for ${existingEntry.user.firstName} ${existingEntry.user.lastName}`,
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

  async rejectEntry(id: number, adminNote?: string) {
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
        status: 'REJECTED',
        adminNote,
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
      action: 'REJECT_TIME_ENTRY',
      entityType: 'TimeEntry',
      entityId: entry.id,
      description: `Afviste tidsregistrering for ${existingEntry.user.firstName} ${existingEntry.user.lastName}`,
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
      note?: string | null;
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

    this.ensureEntryEditable(existingEntry, user);

    const oldClockIn = existingEntry.clockIn;
    const oldClockOut = existingEntry.clockOut;
    const oldNote = existingEntry.note;

    const newClockIn = new Date(data.clockIn);
    const newClockOut = data.clockOut ? new Date(data.clockOut) : null;

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

    if (deviation.requiresNote && !this.hasText(data.note)) {
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

    if ((oldNote ?? '') !== (data.note ?? '')) {
      changes.push(`Note ændret`);
    }

    if (changes.length === 0) {
      changes.push('Ingen ændring registreret');
    }

    const entry = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        clockIn: newClockIn,
        clockOut: newClockOut,
        note: data.note,
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
      clockIn: string;
      clockOut?: string | null;
      adminNote?: string;
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

    const oldClockIn = existingEntry.clockIn;
    const oldClockOut = existingEntry.clockOut;

    const newClockIn = new Date(data.clockIn);
    const newClockOut = data.clockOut ? new Date(data.clockOut) : null;

    if (Number.isNaN(newClockIn.getTime())) {
      throw new BadRequestException('Ugyldig mødetid');
    }

    if (newClockOut && Number.isNaN(newClockOut.getTime())) {
      throw new BadRequestException('Ugyldig fyraften');
    }

    if (newClockOut && newClockOut <= newClockIn) {
      throw new BadRequestException('Fyraften skal være efter mødetid');
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

    if (changes.length === 0) {
      changes.push('Ingen tidsændring registreret');
    }

    const entry = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        clockIn: newClockIn,
        clockOut: newClockOut,
        adminNote: data.adminNote,
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
}
