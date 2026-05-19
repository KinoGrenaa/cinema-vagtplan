import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeaveRequestsService {
  constructor(private prisma: PrismaService) {}

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

  create(data: {
    startDate: string;
    endDate: string;
    reason?: string;
    cinemaId: number;
    userId: number;
  }) {
    return this.prisma.leaveRequest.create({
      data: {
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reason: data.reason,
        cinemaId: data.cinemaId,
        userId: data.userId,
      },
    });
  }

  updateStatus(id: number, status: 'APPROVED' | 'REJECTED') {
    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status },
    });
  }
}