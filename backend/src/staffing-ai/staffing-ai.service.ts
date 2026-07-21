import { Injectable } from '@nestjs/common';
import { AvailabilityEngineService } from './availability-engine.service';
import { FatigueEngineService } from './fatigue-engine.service';
import {
  parseStaffingAiDateRange,
  parseStaffingAiId,
  parseStaffingAiLimit,
} from './staffing-ai-input';
import { StaffingRankingService } from './staffing-ranking.service';
import { StaffingScore } from './types/staffing-score.type';

@Injectable()
export class StaffingAiService {
  constructor(
    private availabilityEngine: AvailabilityEngineService,
    private fatigueEngine: FatigueEngineService,
    private staffingRanking: StaffingRankingService,
  ) {}

  async rankEmployeesForShift(
    cinemaId: number,
    startTime: Date,
    endTime: Date,
  ): Promise<StaffingScore[]> {
    const validatedCinemaId = parseStaffingAiId(
      cinemaId,
      'Biograf skal være et gyldigt ID',
    );
    const { start, end } = parseStaffingAiDateRange(
      startTime,
      endTime,
    );
    const rankedEmployees =
      await this.staffingRanking.rankEmployeesForEmergency(
        validatedCinemaId,
      );
    const finalScores: StaffingScore[] = [];

    for (const employee of rankedEmployees) {
      const validatedUserId = parseStaffingAiId(
        employee.userId,
        'Medarbejder skal være et gyldigt ID',
      );
      const availability =
        await this.availabilityEngine.getAvailabilityScore(
          validatedCinemaId,
          validatedUserId,
          start,
          end,
        );
      const fatigue =
        await this.fatigueEngine.calculateFatigueScore(
          validatedUserId,
        );
      const acceptanceScore =
        employee.acceptanceScore;
      const emergencyScore =
        employee.emergencyScore;
      const totalScore =
        availability.score +
        acceptanceScore * 40 +
        emergencyScore * 25 -
        fatigue.fatigueScore * 20 -
        fatigue.overtimeScore * 20;

      finalScores.push({
        userId: validatedUserId,
        totalScore,
        fatigueScore: fatigue.fatigueScore,
        overtimeScore: fatigue.overtimeScore,
        availabilityScore: availability.score,
        acceptanceScore,
        emergencyScore,
        reasoning: [
          ...employee.reasoning,
          ...availability.reasoning,
          ...fatigue.reasoning,
        ],
      });
    }

    return finalScores.sort(
      (a, b) => b.totalScore - a.totalScore,
    );
  }

  async getBestEmployeeForEmergency(
    cinemaId: number,
    startTime: Date,
    endTime: Date,
  ) {
    const rankedEmployees =
      await this.rankEmployeesForShift(
        cinemaId,
        startTime,
        endTime,
      );

    return rankedEmployees[0] ?? null;
  }

  async getTopEmergencyCandidates(
    cinemaId: number,
    startTime: Date,
    endTime: Date,
    limit = 5,
  ) {
    const safeLimit = parseStaffingAiLimit(limit);
    const rankedEmployees =
      await this.rankEmployeesForShift(
        cinemaId,
        startTime,
        endTime,
      );

    return rankedEmployees.slice(0, safeLimit);
  }
}
