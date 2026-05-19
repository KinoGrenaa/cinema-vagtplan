import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class TimeEntriesService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  findForUser(userId: number) {
    return this.prisma.timeEntry.findMany({
      where: { userId },
      include: {
        shift: {
          include: {
            workType: true,
          },
        },
        user: true,
      },
      orderBy: {
        clockIn: 'desc',
      },
    });
  }

  findAll() {
    return this.prisma.timeEntry.findMany({
      include: {
        user: true,
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

  findOpenEntry(userId: number) {
    return this.prisma.timeEntry.findFirst({
      where: {
        userId,
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
    const shift = await this.prisma.shift.findUnique({
      where: { id: data.shiftId },
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
        clockIn,
        clockOut,
        note: data.note,
        status: 'PENDING',
      },
    });

    this.realtime.notifyAll('timeEntriesUpdated', entry);

    return entry;
  }

  async clockIn(data: {
    userId: number;
    cinemaId: number;
    shiftId?: number | null;
  }) {
    const openEntry = await this.findOpenEntry(data.userId);

    if (openEntry) {
      return openEntry;
    }

    const entry = await this.prisma.timeEntry.create({
      data: {
        userId: data.userId,
        cinemaId: data.cinemaId,
        shiftId: data.shiftId || null,
        clockIn: new Date(),
        status: 'PENDING',
      },
    });

    this.realtime.notifyAll('timeEntriesUpdated', entry);

    return entry;
  }

  async clockOut(id: number) {
    const entry = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        clockOut: new Date(),
      },
    });

    this.realtime.notifyAll('timeEntriesUpdated', entry);

    return entry;
  }

  async approveEntry(id: number) {
    const entry = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        status: 'APPROVED',
      },
    });

    this.realtime.notifyAll('timeEntriesUpdated', entry);

    return entry;
  }

  async unapproveEntry(id: number) {
    const entry = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        status: 'PENDING',
      },
    });

    this.realtime.notifyAll('timeEntriesUpdated', entry);

    return entry;
  }

  async rejectEntry(id: number, adminNote?: string) {
    const entry = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        status: 'REJECTED',
        adminNote,
      },
    });

    this.realtime.notifyAll('timeEntriesUpdated', entry);

    return entry;
  }

  async updateEntry(
    id: number,
    data: {
      clockIn: string;
      clockOut?: string | null;
      adminNote?: string;
    },
  ) {
    if (!data.adminNote || data.adminNote.trim() === '') {
      throw new BadRequestException(
        'Admin-note er påkrævet ved rettelse af timer',
      );
    }

    const entry = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        clockIn: new Date(data.clockIn),
        clockOut: data.clockOut ? new Date(data.clockOut) : null,
        adminNote: data.adminNote,
        status: 'PENDING',
      },
    });

    this.realtime.notifyAll('timeEntriesUpdated', entry);

    return entry;
  }
}