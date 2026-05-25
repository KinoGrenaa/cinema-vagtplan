import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type StaffingPressureLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

@Injectable()
export class PredictiveStaffingService {
  constructor(private prisma: PrismaService) {}

  async predictStaffingPressure(params: {
    cinemaId: number;
    startTime: Date;
    endTime: Date;
  }): Promise<{
    level: StaffingPressureLevel;
    score: number;
    reasoning: string[];
  }> {
    const reasoning: string[] = [];

    let score = 0;

    const movieShowings = await this.prisma.movieShowing.findMany({
      where: {
        cinemaId: params.cinemaId,

        startTime: {
          gte: params.startTime,
          lte: params.endTime,
        },
      },
    });

    const shifts = await this.prisma.shift.findMany({
      where: {
        cinemaId: params.cinemaId,

        startTime: {
          gte: params.startTime,
          lte: params.endTime,
        },
      },
    });

    const showingsCount = movieShowings.length;
    const staffingCount = shifts.length;

    score += showingsCount * 15;

    reasoning.push(`${showingsCount} filmvisninger i perioden`);

    reasoning.push(`${staffingCount} vagter planlagt`);

    const hour = params.startTime.getHours();

    const day = params.startTime.getDay();

    const isWeekend = day === 5 || day === 6 || day === 0;

    if (isWeekend) {
      score += 25;

      reasoning.push('Weekend pressure detected');
    }

    if (hour >= 18 && hour <= 23) {
      score += 30;

      reasoning.push('Evening peak pressure');
    }

    if (showingsCount >= 6) {
      score += 40;

      reasoning.push('High movie activity');
    }

    if (staffingCount < showingsCount) {
      score += 50;

      reasoning.push('Potential understaffing detected');
    }

    const recentEmergencyRequests = await this.prisma.staffingRequest.count({
      where: {
        cinemaId: params.cinemaId,

        type: 'EMERGENCY',

        createdAt: {
          gte: new Date(params.startTime.getTime() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (recentEmergencyRequests >= 5) {
      score += 40;

      reasoning.push('Recent emergency staffing trend detected');
    }

    let level: StaffingPressureLevel = 'LOW';

    if (score >= 140) {
      level = 'CRITICAL';
    } else if (score >= 90) {
      level = 'HIGH';
    } else if (score >= 50) {
      level = 'MEDIUM';
    }

    reasoning.push(`Predicted staffing pressure: ${level}`);

    return {
      level,
      score,
      reasoning,
    };
  }
}
