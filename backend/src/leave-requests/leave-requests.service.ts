import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AbsenceImpactEngineService } from '../staffing-ai/absence-impact-engine.service';

@Injectable()
export class LeaveRequestsService {
  constructor(
    private prisma: PrismaService,
    private absenceImpactEngineService: AbsenceImpactEngineService,
  ) {}

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

  findAll() {
    return this.prisma.leaveRequest.findMany({
      include: {
        user: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  async create(data: {
    startDate: string;
    endDate: string;
    reason?: string;
    cinemaId: number;
    userId: number;
  }) {
    const leaveRequest = await this.prisma.leaveRequest.create({
      data: {
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reason: data.reason,
        cinemaId: data.cinemaId,
        userId: data.userId,
      },
    });

    const absenceImpact = await this.analyzeAbsenceImpact(leaveRequest);

    return {
      leaveRequest,
      absenceImpact,
    };
  }

  async updateStatus(id: number, status: 'APPROVED' | 'REJECTED') {
    const leaveRequest = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status },
    });

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