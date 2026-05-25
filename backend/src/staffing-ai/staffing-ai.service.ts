import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityEngineService } from './availability-engine.service';
import { FatigueEngineService } from './fatigue-engine.service';
import { StaffingRankingService } from './staffing-ranking.service';
import { StaffingScore } from './types/staffing-score.type';

@Injectable()
export class StaffingAiService {
  constructor(
    private prisma: PrismaService,
    private availabilityEngine: AvailabilityEngineService,
    private fatigueEngine: FatigueEngineService,
    private staffingRanking: StaffingRankingService,
  ) {}

  async rankEmployeesForShift(
    cinemaId: number,
    startTime: Date,
    endTime: Date,
  ): Promise<StaffingScore[]> {
    const rankedEmployees =
      await this.staffingRanking.rankEmployeesForEmergency(cinemaId);

    const finalScores: StaffingScore[] = [];

    for (const employee of rankedEmployees) {
      const availability = await this.availabilityEngine.getAvailabilityScore(
        employee.userId,
        startTime,
        endTime,
      );

      const fatigue = await this.fatigueEngine.calculateFatigueScore(
        employee.userId,
      );

      const profile = await this.prisma.staffingAiProfile.findUnique({
        where: {
          userId: employee.userId,
        },
      });

      const acceptanceScore = profile?.acceptanceRate ?? 0;

      const emergencyScore = profile?.emergencyAcceptanceRate ?? 0;

      const totalScore =
        availability.score +
        acceptanceScore * 40 +
        emergencyScore * 25 -
        fatigue.fatigueScore * 20 -
        fatigue.overtimeScore * 20;

      finalScores.push({
        userId: employee.userId,

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

    return finalScores.sort((a, b) => b.totalScore - a.totalScore);
  }

  async getBestEmployeeForEmergency(
    cinemaId: number,
    startTime: Date,
    endTime: Date,
  ) {
    const rankedEmployees = await this.rankEmployeesForShift(
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
    const rankedEmployees = await this.rankEmployeesForShift(
      cinemaId,
      startTime,
      endTime,
    );

    return rankedEmployees.slice(0, limit);
  }
}
