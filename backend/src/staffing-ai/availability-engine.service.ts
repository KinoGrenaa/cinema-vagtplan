import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AvailabilityEngineService {
  constructor(private prisma: PrismaService) {}

  async getAvailabilityScore(
    cinemaId: number,
    userId: number,
    startTime: Date,
    endTime: Date,
  ): Promise<{
    score: number;
    reasoning: string[];
  }> {
    const reasoning: string[] = [];
    let score = 100;

    const overlappingShift = await this.prisma.shift.findFirst({
      where: {
        userId,
        startTime: {
          lt: endTime,
        },
        endTime: {
          gt: startTime,
        },
      },
    });

    if (overlappingShift) {
      reasoning.push('Brugeren har allerede en overlappende vagt');
      return {
        score: 0,
        reasoning,
      };
    }

    const approvedLeave = await this.prisma.leaveRequest.findFirst({
      where: {
        cinemaId,
        userId,
        status: 'APPROVED',
        startDate: {
          lte: endTime,
        },
        endDate: {
          gte: startTime,
        },
      },
    });

    if (approvedLeave) {
      reasoning.push('Brugeren har godkendt fravær');
      return {
        score: 0,
        reasoning,
      };
    }

    const recentShifts = await this.prisma.shift.findMany({
      where: {
        userId,
        endTime: {
          gte: new Date(startTime.getTime() - 12 * 60 * 60 * 1000),
          lte: startTime,
        },
      },
      orderBy: {
        endTime: 'desc',
      },
      take: 1,
    });

    if (recentShifts.length > 0) {
      const latestShift = recentShifts[0];
      const restHours =
        (startTime.getTime() - new Date(latestShift.endTime).getTime()) /
        (1000 * 60 * 60);

      if (restHours < 8) {
        score -= 50;
        reasoning.push(
          `Kun ${restHours.toFixed(1)} timers hvile siden sidste vagt`,
        );
      } else if (restHours < 12) {
        score -= 20;
        reasoning.push(`Reduceret hviletid (${restHours.toFixed(1)} timer)`);
      }
    }

    return {
      score: Math.max(0, score),
      reasoning,
    };
  }
}
