import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class TimeEntriesService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  private getCinemaFilter(user?: any) {
    if (!user || user.role === 'MASTER') {
      return {};
    }

    return {
      cinemaId: user.cinemaId,
    };
  }

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
        clockIn,
        clockOut,
        note: data.note,
        status: 'PENDING',
      },
    });

    this.realtime.notifyCinema(entry.cinemaId, 'timeEntriesUpdated', entry);

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

    const entry = await this.prisma.timeEntry.create({
      data: {
        userId: data.userId,
        cinemaId: data.cinemaId,
        shiftId: data.shiftId || null,
        clockIn: new Date(),
        status: 'PENDING',
      },
    });

    this.realtime.notifyCinema(entry.cinemaId, 'timeEntriesUpdated', entry);

    return entry;
  }

  async clockOut(id: number) {
    const existingEntry = await this.prisma.timeEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      throw new NotFoundException('Tidsregistrering blev ikke fundet');
    }

    const entry = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        clockOut: new Date(),
      },
    });

    this.realtime.notifyCinema(entry.cinemaId, 'timeEntriesUpdated', entry);

    return entry;
  }

  async approveEntry(id: number) {
    const existingEntry = await this.prisma.timeEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      throw new NotFoundException('Tidsregistrering blev ikke fundet');
    }

    const entry = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        status: 'APPROVED',
      },
    });

    this.realtime.notifyCinema(entry.cinemaId, 'timeEntriesUpdated', entry);

    return entry;
  }

  async unapproveEntry(id: number) {
    const existingEntry = await this.prisma.timeEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      throw new NotFoundException('Tidsregistrering blev ikke fundet');
    }

    const entry = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        status: 'PENDING',
      },
    });

    this.realtime.notifyCinema(entry.cinemaId, 'timeEntriesUpdated', entry);

    return entry;
  }

  async rejectEntry(id: number, adminNote?: string) {
    const existingEntry = await this.prisma.timeEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      throw new NotFoundException('Tidsregistrering blev ikke fundet');
    }

    const entry = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        status: 'REJECTED',
        adminNote,
      },
    });

    this.realtime.notifyCinema(entry.cinemaId, 'timeEntriesUpdated', entry);

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
    const existingEntry = await this.prisma.timeEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      throw new NotFoundException('Tidsregistrering blev ikke fundet');
    }

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

    this.realtime.notifyCinema(entry.cinemaId, 'timeEntriesUpdated', entry);

    return entry;
  }
}
