import { Injectable } from '@nestjs/common';
import { ScheduleSimulationService } from './schedule-simulation.service';

type ScheduleComparisonInput = {
  id: string;
  label: string;
  cinemaId: number;
  startDate: Date;
  endDate: Date;
};

@Injectable()
export class ScheduleComparisonService {
  constructor(private scheduleSimulationService: ScheduleSimulationService) {}

  async compareSchedules(schedules: ScheduleComparisonInput[]) {
    const scheduleScores = await Promise.all(
      schedules.map(async (schedule) => {
        const simulation =
          await this.scheduleSimulationService.simulateSchedule({
            cinemaId: schedule.cinemaId,
            startDate: schedule.startDate,
            endDate: schedule.endDate,
          });

        const finalScore =
          simulation.optimizationScore -
          simulation.staffingRiskScore * 0.4 -
          simulation.fatigueImpactScore * 0.25 -
          simulation.overtimeExposureScore * 0.25 -
          simulation.emergencyLikelihoodScore * 0.3;

        return {
          schedule,
          simulation,
          finalScore: Math.max(0, Math.round(finalScore)),
        };
      }),
    );

    const rankedSchedules = scheduleScores.sort(
      (a, b) => b.finalScore - a.finalScore,
    );

    const bestSchedule = rankedSchedules[0] ?? null;

    return {
      bestSchedule,
      scheduleScores: rankedSchedules,
      recommendation: bestSchedule
        ? `AI recommends "${bestSchedule.schedule.label}" with score ${bestSchedule.finalScore}.`
        : 'No schedules available for comparison.',
    };
  }
}
