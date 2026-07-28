import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { findMovieStaffingIssues } from './movie-staffing-coverage';
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
          lt: params.endDate,
        },
        endTime: {
          gt: params.startDate,
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
          lt: params.endDate,
        },
        endTime: {
          gt: params.startDate,
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

    const uncoveredPeriods = findMovieStaffingIssues({
      cinemaId: params.cinemaId,
      startTime: params.startDate,
      endTime: params.endDate,
      shifts,
      movieShowings,
    }).map((issue) => ({
      startTime: issue.startTime,
      endTime: issue.endTime,
      reason:
        `Only ${issue.assignedStaff}/${issue.requiredStaff} staff assigned ` +
        `for ${issue.movieShowings} movie showing${
          issue.movieShowings === 1 ? '' : 's'
        }.`,
    }));

    for (const period of uncoveredPeriods) {
      recommendations.push(
        `Add more staff around ${period.startTime.toISOString()}`,
      );
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
