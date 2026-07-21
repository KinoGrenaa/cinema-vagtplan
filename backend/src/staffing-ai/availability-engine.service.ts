import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  parseStaffingAiDateRange,
  parseStaffingAiId,
} from './staffing-ai-input';

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
    const validatedCinemaId = parseStaffingAiId(
      cinemaId,
      'Biograf skal være et gyldigt ID',
    );
    const validatedUserId = parseStaffingAiId(
      userId,
      'Bruger skal være et gyldigt ID',
    );
    const { start, end } = parseStaffingAiDateRange(
      startTime,
      endTime,
    );
    const reasoning: string[] = [];
    let score = 100;

    const overlappingShift =
      await this.prisma.shift.findFirst({
        where: {
          userId: validatedUserId,
          startTime: {
            lt: end,
          },
          endTime: {
            gt: start,
          },
        },
        select: {
          id: true,
        },
      });

    if (overlappingShift) {
      reasoning.push(
        'Brugeren har allerede en overlappende vagt',
      );

      return {
        score: 0,
        reasoning,
      };
    }

    const approvedLeave =
      await this.prisma.leaveRequest.findFirst({
        where: {
          cinemaId: validatedCinemaId,
          userId: validatedUserId,
          status: 'APPROVED',
          startDate: {
            lte: end,
          },
          endDate: {
            gte: start,
          },
        },
        select: {
          id: true,
        },
      });

    if (approvedLeave) {
      reasoning.push('Brugeren har godkendt fravær');

      return {
        score: 0,
        reasoning,
      };
    }

    const latestRecentShift =
      await this.prisma.shift.findFirst({
        where: {
          userId: validatedUserId,
          endTime: {
            gte: new Date(
              start.getTime() - 12 * 60 * 60 * 1000,
            ),
            lte: start,
          },
        },
        orderBy: {
          endTime: 'desc',
        },
        select: {
          endTime: true,
        },
      });

    if (latestRecentShift) {
      const restHours =
        (start.getTime() -
          new Date(
            latestRecentShift.endTime,
          ).getTime()) /
        (1000 * 60 * 60);

      if (restHours < 8) {
        score -= 50;
        reasoning.push(
          `Kun ${restHours.toFixed(1)} timers hvile siden sidste vagt`,
        );
      } else if (restHours < 12) {
        score -= 20;
        reasoning.push(
          `Reduceret hviletid (${restHours.toFixed(1)} timer)`,
        );
      }
    }

    return {
      score: Math.max(0, score),
      reasoning,
    };
  }
}
