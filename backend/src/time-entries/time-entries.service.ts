import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class TimeEntriesService {
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

  findForUser(userId: number) {
    return this.prisma.timeEntry.findMany({
      where: { userId },
      include: {
        user: true,
        payrollType: true,
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
  }

  findAll(user?: any) {
    return this.prisma.timeEntry.findMany({
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
  }

  findOpenEntry(userId: number, cinemaId?: number) {
    return this.prisma.timeEntry.findFirst({
      where: {
        userId,
        ...(cinemaId ? { cinemaId } : {}),
        clockOut: null,
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

    const hasDeviation =
      shift.startTime.getTime() !== clockIn.getTime() ||
      shift.endTime.getTime() !== clockOut.getTime();

    if (hasDeviation && (!data.note || data.note.trim() === '')) {
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
    });

    await this.auditLogsService.create({
      action: 'SUBMIT_MANUAL_TIME_ENTRY',
      entityType: 'TimeEntry',
      entityId: entry.id,
      description: 'Medarbejder indsendte manuel tidsregistrering',
      userId: entry.userId,
      cinemaId: entry.cinemaId,
    });

    this.realtimeGateway.notifyCinema(
      entry.cinemaId,
      'timeEntriesUpdated',
      entry,
    );

    return entry;
  }

  async clockIn(data: {
    userId: number;
    cinemaId: number;
    shiftId?: number | null;
  }) {
    const openEntry = await this.findOpenEntry(data.userId, data.cinemaId);

    if (openEntry) {
      return openEntry;
    }

    let payrollTypeId: number | null = null;

    if (data.shiftId) {
      const shift = await this.prisma.shift.findFirst({
        where: {
          id: data.shiftId,
          cinemaId: data.cinemaId,
        },
        include: {
          workType: true,
        },
      });

      payrollTypeId = shift?.workType?.payrollTypeId || null;
    }

    const entry = await this.prisma.timeEntry.create({
      data: {
        userId: data.userId,
        cinemaId: data.cinemaId,
        shiftId: data.shiftId || null,
        payrollTypeId,
        clockIn: new Date(),
        status: 'PENDING',
      },
    });

    await this.auditLogsService.create({
      action: 'CLOCK_IN',
      entityType: 'TimeEntry',
      entityId: entry.id,
      description: 'Medarbejder stemplede ind',
      userId: entry.userId,
      cinemaId: entry.cinemaId,
    });

    this.realtimeGateway.notifyCinema(
      entry.cinemaId,
      'timeEntriesUpdated',
      entry,
    );

    return entry;
  }

  async clockOut(id: number) {
    const existingEntry = await this.prisma.timeEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      throw new NotFoundException('Tidsregistrering blev ikke fundet');
    }

    this.ensureEntryEditable(existingEntry);

    const entry = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        clockOut: new Date(),
      },
    });

    await this.auditLogsService.create({
      action: 'CLOCK_OUT',
      entityType: 'TimeEntry',
      entityId: entry.id,
      description: 'Medarbejder stemplede ud',
      userId: entry.userId,
      cinemaId: entry.cinemaId,
    });

    this.realtimeGateway.notifyCinema(
      entry.cinemaId,
      'timeEntriesUpdated',
      entry,
    );

    return entry;
  }

  async approveEntry(id: number) {
    const existingEntry = await this.prisma.timeEntry.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingEntry) {
      throw new NotFoundException('Tidsregistrering blev ikke fundet');
    }

    this.ensureEntryEditable(existingEntry);

    const entry = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        status: 'APPROVED',
      },
    });

    await this.auditLogsService.create({
      action: 'APPROVE_TIME_ENTRY',
      entityType: 'TimeEntry',
      entityId: entry.id,
      description: `Godkendte tidsregistrering for ${existingEntry.user.firstName} ${existingEntry.user.lastName}`,
      cinemaId: entry.cinemaId,
    });

    this.realtimeGateway.notifyCinema(
      entry.cinemaId,
      'timeEntriesUpdated',
      entry,
    );

    return entry;
  }

  async unapproveEntry(id: number) {
    const existingEntry = await this.prisma.timeEntry.findUnique({
      where: { id },
      include: { user: true },
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
    });

    await this.auditLogsService.create({
      action: 'UNAPPROVE_TIME_ENTRY',
      entityType: 'TimeEntry',
      entityId: entry.id,
      description: `Fjernede godkendelse af tidsregistrering for ${existingEntry.user.firstName} ${existingEntry.user.lastName}`,
      cinemaId: entry.cinemaId,
    });

    this.realtimeGateway.notifyCinema(
      entry.cinemaId,
      'timeEntriesUpdated',
      entry,
    );

    return entry;
  }

  async rejectEntry(id: number, adminNote?: string) {
    const existingEntry = await this.prisma.timeEntry.findUnique({
      where: { id },
      include: { user: true },
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
    });

    await this.auditLogsService.create({
      action: 'REJECT_TIME_ENTRY',
      entityType: 'TimeEntry',
      entityId: entry.id,
      description: `Afviste tidsregistrering for ${existingEntry.user.firstName} ${existingEntry.user.lastName}`,
      cinemaId: entry.cinemaId,
    });

    this.realtimeGateway.notifyCinema(
      entry.cinemaId,
      'timeEntriesUpdated',
      entry,
    );

    return entry;
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
      include: { user: true },
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
      throw new BadRequestException('Ugyldig clock ind');
    }

    if (newClockOut && Number.isNaN(newClockOut.getTime())) {
      throw new BadRequestException('Ugyldig clock ud');
    }

    if (newClockOut && newClockOut <= newClockIn) {
      throw new BadRequestException('Clock ud skal være efter clock ind');
    }

    const changes: string[] = [];

    if (oldClockIn.getTime() !== newClockIn.getTime()) {
      changes.push(
        `Clock ind: ${oldClockIn.toLocaleString('da-DK')} → ${newClockIn.toLocaleString('da-DK')}`,
      );
    }

    if ((oldClockOut?.getTime() ?? null) !== (newClockOut?.getTime() ?? null)) {
      changes.push(
        `Clock ud: ${
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

    this.realtimeGateway.notifyCinema(
      entry.cinemaId,
      'timeEntriesUpdated',
      entry,
    );

    return entry;
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
      include: { user: true },
    });

    if (!existingEntry) {
      throw new NotFoundException('Tidsregistrering blev ikke fundet');
    }

    this.ensureEntryEditable(existingEntry, user);

    if (!data.adminNote || data.adminNote.trim() === '') {
      throw new BadRequestException(
        'Admin-note er påkrævet ved rettelse af timer',
      );
    }

    const oldClockIn = existingEntry.clockIn;
    const oldClockOut = existingEntry.clockOut;

    const newClockIn = new Date(data.clockIn);
    const newClockOut = data.clockOut ? new Date(data.clockOut) : null;

    const changes: string[] = [];

    if (oldClockIn.getTime() !== newClockIn.getTime()) {
      changes.push(
        `Clock ind: ${oldClockIn.toLocaleString('da-DK')} → ${newClockIn.toLocaleString('da-DK')}`,
      );
    }

    if ((oldClockOut?.getTime() ?? null) !== (newClockOut?.getTime() ?? null)) {
      changes.push(
        `Clock ud: ${
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

    this.realtimeGateway.notifyCinema(
      entry.cinemaId,
      'timeEntriesUpdated',
      entry,
    );

    return entry;
  }
}
