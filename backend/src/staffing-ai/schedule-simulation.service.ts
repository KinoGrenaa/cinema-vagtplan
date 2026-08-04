import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PredictiveStaffingService } from './predictive-staffing.service';

@Injectable()
export class ScheduleSimulationService {
  constructor(
    private prisma: PrismaService,
    private predictiveStaffingService: PredictiveStaffingService,
  ) {}

  async simulateSchedule(params: {
    cinemaId: number;
    startDate: Date;
    endDate: Date;
  }) {
    const reasoning: string[] = [];
    const recommendations: string[] = [];

    let staffingRiskScore = 0;
    let fatigueImpactScore = 0;
    let overtimeExposureScore = 0;
    let emergencyLikelihoodScore = 0;
    let optimizationScore = 100;

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
        jobFunction: true,
      },
    });

    const prediction =
      await this.predictiveStaffingService.predictStaffingPressure({
        cinemaId: params.cinemaId,
        startTime: params.startDate,
        endTime: params.endDate,
      });

    reasoning.push(`Predicted staffing pressure: ${prediction.level}`);

    if (prediction.level === 'HIGH') {
      staffingRiskScore += 40;
      optimizationScore -= 15;

      recommendations.push(
        'Increase staffing during predicted high pressure periods',
      );
    }

    if (prediction.level === 'CRITICAL') {
      staffingRiskScore += 70;
      emergencyLikelihoodScore += 60;
      optimizationScore -= 30;

      recommendations.push('Critical staffing pressure predicted');
    }

    const uncoveredPeriods: {
      startTime: Date;
      endTime: Date;
      reason: string;
    }[] = [];

    const groupedHours = new Map<
      string,
      {
        shifts: number;
      }
    >();

    for (const shift of shifts) {
      const hourKey = new Date(shift.startTime).toISOString();

      if (!groupedHours.has(hourKey)) {
        groupedHours.set(hourKey, {
          shifts: 0,
        });
      }

      groupedHours.get(hourKey)!.shifts += 1;

      const profile = shift.user?.staffingAiProfile;

      if (!profile) {
        continue;
      }

      if (profile.fatigueScore >= 60) {
        fatigueImpactScore += 15;
        optimizationScore -= 5;

        recommendations.push(`Reduce fatigue load for user ${shift.userId}`);
      }

      if (profile.overtimeScore >= 60) {
        overtimeExposureScore += 20;
        optimizationScore -= 5;

        recommendations.push(
          `Reduce overtime exposure for user ${shift.userId}`,
        );
      }
    }

    for (const [hour, data] of groupedHours.entries()) {
      if (data.shifts < 2) {
        staffingRiskScore += 20;

        const startTime = new Date(hour);

        const endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + 2);

        uncoveredPeriods.push({
          startTime,
          endTime,
          reason: `Low staffing coverage detected (${data.shifts} staff).`,
        });

        recommendations.push(
          `Increase staffing around ${startTime.toISOString()}`,
        );
      }
    }

    if (uncoveredPeriods.length >= 3) {
      emergencyLikelihoodScore += 40;

      recommendations.push('Multiple uncovered periods detected');
    }

    if (fatigueImpactScore >= 50) {
      recommendations.push('High fatigue impact detected across schedule');
    }

    if (overtimeExposureScore >= 50) {
      recommendations.push('High overtime exposure detected');
    }

    optimizationScore = Math.max(0, Math.min(100, optimizationScore));

    return {
      staffingRiskScore,
      fatigueImpactScore,
      overtimeExposureScore,
      emergencyLikelihoodScore,
      optimizationScore,
      prediction,
      uncoveredPeriods,
      recommendations,
      reasoning,
    };
  }
}
