import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiLearningService {
  constructor(private prisma: PrismaService) {}

  async createEvent(data: {
    cinemaId: number;
    type: string;
    severity?: string;
    metadata?: any;
  }) {
    return this.prisma.aiLearningEvent.create({
      data,
    });
  }

  async getStatistics(cinemaId: number) {
    const events = await this.prisma.aiLearningEvent.findMany({
      where: {
        cinemaId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 500,
    });

    return {
      totalEvents: events.length,

      emergencyEvents: events.filter(
        (event) => event.type === 'EMERGENCY_STAFFING',
      ).length,

      overtimeEvents: events.filter(
        (event) => event.type === 'OVERTIME_WARNING',
      ).length,

      fatigueEvents: events.filter((event) => event.type === 'FATIGUE_WARNING')
        .length,
    };
  }
}
