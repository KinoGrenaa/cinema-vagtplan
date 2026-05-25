import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StaffingMonitorService } from '../staffing-ai/staffing-monitor.service';

@Injectable()
export class LeaveRequestsService {
  constructor(
    private prisma: PrismaService,
    private staffingMonitorService: StaffingMonitorService,
  ) {}

  private async triggerStaffingMonitor() {
    try {
      await this.staffingMonitorService.checkForStaffingProblems();
    } catch (error) {
      console.error('Staffing monitor trigger failed', error);
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

    await this.triggerStaffingMonitor();

    return leaveRequest;
  }

  async updateStatus(id: number, status: 'APPROVED' | 'REJECTED') {
    const leaveRequest = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status },
    });

    await this.triggerStaffingMonitor();

    return leaveRequest;
  }
}
