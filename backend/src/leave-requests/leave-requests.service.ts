import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AbsenceImpactEngineService } from '../staffing-ai/absence-impact-engine.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class LeaveRequestsService {
  constructor(
    private prisma: PrismaService,
    private absenceImpactEngineService: AbsenceImpactEngineService,
    private realtimeGateway: RealtimeGateway,
  ) {}

  private getTomorrowStart() {
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  private validateDates(startDate: Date, endDate: Date) {
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Ugyldig dato eller tid.');
    }

    if (startDate < this.getTomorrowStart()) {
      throw new BadRequestException(
        'Du kan ikke anmode om fri i dag eller tilbage i tiden.',
      );
    }

    if (endDate <= startDate) {
      throw new BadRequestException(
        'Sluttidspunkt skal være efter starttidspunkt.',
      );
    }
  }

  private async findOverlappingShift(
    userId: number,
    cinemaId: number,
    startDate: Date,
    endDate: Date,
  ) {
    return this.prisma.shift.findFirst({
      where: {
        userId,
        cinemaId,
        startTime: { lt: endDate },
        endTime: { gt: startDate },
      },
      include: {
        workType: true,
      },
    });
  }

  private async ensureNoOverlappingShift(
    userId: number,
    cinemaId: number,
    startDate: Date,
    endDate: Date,
  ) {
    const shift = await this.findOverlappingShift(
      userId,
      cinemaId,
      startDate,
      endDate,
    );

    if (shift) {
      throw new BadRequestException(
        'Medarbejderen har allerede en vagt i det valgte tidsrum.',
      );
    }
  }

  private async analyzeAbsenceImpact(leaveRequest: {
    id: number;
    userId: number;
    cinemaId: number;
    startDate: Date;
    endDate: Date;
  }) {
    try {
      return await this.absenceImpactEngineService.analyzeLeaveImpact({
        leaveRequestId: leaveRequest.id,
        userId: leaveRequest.userId,
        cinemaId: leaveRequest.cinemaId,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
      });
    } catch (error) {
      console.error('Absence impact analysis failed', error);
      return null;
    }
  }

  findAll(user: any) {
    const isAdmin = user.role === 'ADMIN' || user.role === 'MASTER';

    return this.prisma.leaveRequest.findMany({
      where: {
        cinemaId: user.cinemaId,
        ...(isAdmin ? {} : { userId: user.sub }),
      },
      include: {
        user: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  async create(
    user: any,
    data: {
      startDate: string;
      endDate: string;
      reason?: string;
    },
  ) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    this.validateDates(startDate, endDate);

    await this.ensureNoOverlappingShift(
      user.sub,
      user.cinemaId,
      startDate,
      endDate,
    );

    const leaveRequest = await this.prisma.leaveRequest.create({
      data: {
        startDate,
        endDate,
        reason: data.reason,
        cinemaId: user.cinemaId,
        userId: user.sub,
      },
    });

    this.realtimeGateway.notifyCinema(
      user.cinemaId,
      'leaveRequestsUpdated',
      {},
    );

    const absenceImpact = await this.analyzeAbsenceImpact(leaveRequest);

    return {
      leaveRequest,
      absenceImpact,
    };
  }

  async updateStatus(
    user: any,
    id: number,
    status: 'APPROVED' | 'REJECTED' | 'CANCELLED',
  ) {
    const existing = await this.prisma.leaveRequest.findFirst({
      where: {
        id,
        cinemaId: user.cinemaId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Fraværsansøgningen blev ikke fundet.');
    }

    const isAdmin = user.role === 'ADMIN' || user.role === 'MASTER';
    const isOwner = existing.userId === user.sub;

    if (status === 'CANCELLED') {
      if (!isAdmin && !isOwner) {
        throw new ForbiddenException(
          'Du kan kun annullere dine egne fraværsansøgninger.',
        );
      }

      if (existing.status === 'REJECTED' || existing.status === 'CANCELLED') {
        throw new BadRequestException(
          'Denne fraværsansøgning kan ikke annulleres.',
        );
      }
    } else {
      if (!isAdmin) {
        throw new ForbiddenException(
          'Kun administratorer kan godkende eller afvise fravær.',
        );
      }
    }

    if (status === 'APPROVED') {
      this.validateDates(existing.startDate, existing.endDate);

      await this.ensureNoOverlappingShift(
        existing.userId,
        existing.cinemaId,
        existing.startDate,
        existing.endDate,
      );
    }

    const leaveRequest = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status },
    });

    this.realtimeGateway.notifyCinema(
      leaveRequest.cinemaId,
      'leaveRequestsUpdated',
      {},
    );

    let absenceImpact: any = null;

    if (status === 'APPROVED') {
      absenceImpact = await this.analyzeAbsenceImpact(leaveRequest);
    }

    return {
      leaveRequest,
      absenceImpact,
    };
  }
}
