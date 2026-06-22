import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PredictiveStaffingService } from './predictive-staffing.service';
import { StaffingAiService } from './staffing-ai.service';

@Injectable()
export class ScheduleOptimizationService {
  constructor(
    private prisma: PrismaService,
    private predictiveStaffingService: PredictiveStaffingService,
    private staffingAiService: StaffingAiService,
  ) {}

  async optimizeSchedule(params: {
    cinemaId: number;
    startDate: Date;
    endDate: Date;
  }) {
    const reasoning: string[] = [];

    const recommendations: string[] = [];

    const shifts = await this.prisma.shift.findMany({
      where: {
        cinemaId: params.cinemaId,

        startTime: {
          gte: params.startDate,
          lte: params.endDate,
        },
      },

      include: {
        user: {
          include: {
            staffingAiProfile: true,
          },
        },

        workType: true,
      },
    });

    const movieShowings = await this.prisma.movieShowing.findMany({
      where: {
        cinemaId: params.cinemaId,

        startTime: {
          gte: params.startDate,
          lte: params.endDate,
        },
      },
    });

    const prediction =
      await this.predictiveStaffingService.predictStaffingPressure({
        cinemaId: params.cinemaId,
        startTime: params.startDate,
        endTime: params.endDate,
      });

    reasoning.push(`Predicted pressure: ${prediction.level}`);

    const uncoveredPeriods: {
      startTime: Date;
      endTime: Date;
      reason: string;
    }[] = [];

    const fatigueWarnings: {
      userId: number;
      score: number;
    }[] = [];

    const overtimeWarnings: {
      userId: number;
      score: number;
    }[] = [];

    for (const shift of shifts) {
      const userId = shift.userId;

      if (userId === null) {
        continue;
      }

      const profile = shift.user?.staffingAiProfile;

      if (!profile) {
        continue;
      }

      if (profile.fatigueScore >= 60) {
        fatigueWarnings.push({
          userId,
          score: profile.fatigueScore,
        });

        recommendations.push(`Reduce fatigue load for user ${userId}`);
      }

      if (profile.overtimeScore >= 60) {
        overtimeWarnings.push({
          userId,
          score: profile.overtimeScore,
        });

        recommendations.push(`Reduce overtime load for user ${userId}`);
      }
    }

    const groupedHours = new Map<
      string,
      {
        shifts: number;
        movies: number;
      }
    >();

    for (const shift of shifts) {
      if (shift.userId === null) {
        continue;
      }

      const hourKey = new Date(shift.startTime).toISOString();

      if (!groupedHours.has(hourKey)) {
        groupedHours.set(hourKey, {
          shifts: 0,
          movies: 0,
        });
      }

      groupedHours.get(hourKey)!.shifts += 1;
    }

    for (const movie of movieShowings) {
      const hourKey = new Date(movie.startTime).toISOString();

      if (!groupedHours.has(hourKey)) {
        groupedHours.set(hourKey, {
          shifts: 0,
          movies: 0,
        });
      }

      groupedHours.get(hourKey)!.movies += 1;
    }

    for (const [hour, data] of groupedHours.entries()) {
      const requiredStaff = Math.max(2, data.movies * 2);

      if (data.shifts < requiredStaff) {
        const startTime = new Date(hour);

        const endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + 2);

        uncoveredPeriods.push({
          startTime,
          endTime,

          reason: `Only ${data.shifts}/${requiredStaff} staff assigned.`,
        });

        recommendations.push(
          `Add more staff around ${startTime.toISOString()}`,
        );
      }
    }

    const suggestedStaffing = await Promise.all(
      uncoveredPeriods.map(async (period) => {
        const candidates =
          await this.staffingAiService.getTopEmergencyCandidates(
            params.cinemaId,
            period.startTime,
            period.endTime,
            5,
          );

        return {
          period,
          candidates,
        };
      }),
    );

    if (prediction.level === 'HIGH' || prediction.level === 'CRITICAL') {
      recommendations.push(
        'Increase staffing proactively before peak pressure',
      );
    }

    return {
      prediction,

      uncoveredPeriods,

      fatigueWarnings,

      overtimeWarnings,

      suggestedStaffing,

      recommendations,

      reasoning,
    };
  }
}
