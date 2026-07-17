import { BadRequestException, Injectable } from '@nestjs/common';
import { AvailabilityEngineService } from './availability-engine.service';
import { FatigueEngineService } from './fatigue-engine.service';
import { StaffingRankingService } from './staffing-ranking.service';
import { StaffingScore } from './types/staffing-score.type';

function getRequiredPositiveId(value: unknown, message: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestException(message);
  }
  return id;
}

function getRequiredDate(value: unknown, message: string) {
  const date = value instanceof Date ? value : new Date(value as string);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(message);
  }
  return date;
}

function getValidatedDateRange(startTime: unknown, endTime: unknown) {
  const start = getRequiredDate(startTime, 'Starttid skal være en gyldig dato');
  const end = getRequiredDate(endTime, 'Sluttid skal være en gyldig dato');
  if (end.getTime() <= start.getTime()) {
    throw new BadRequestException('Sluttid skal være efter starttid');
  }
  return { start, end };
}

function getSafeLimit(value: unknown) {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new BadRequestException('Antal kandidater skal være et positivt heltal');
  }
  return Math.min(limit, 20);
}

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
    const validatedCinemaId = getRequiredPositiveId(
      cinemaId,
      'Biograf skal være et gyldigt ID',
    );
    const { start, end } = getValidatedDateRange(startTime, endTime);
    const rankedEmployees = await this.staffingRanking.rankEmployeesForEmergency(
      validatedCinemaId,
    );
    const finalScores: StaffingScore[] = [];

    for (const employee of rankedEmployees) {
      const availability = await this.availabilityEngine.getAvailabilityScore(
        validatedCinemaId,
        employee.userId,
        start,
        end,
      );
      const fatigue = await this.fatigueEngine.calculateFatigueScore(
        employee.userId,
      );
      const acceptanceScore = employee.acceptanceScore;
      const emergencyScore = employee.emergencyScore;
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
    const safeLimit = getSafeLimit(limit);
    const rankedEmployees = await this.rankEmployeesForShift(
      cinemaId,
      startTime,
      endTime,
    );
    return rankedEmployees.slice(0, safeLimit);
  }
}
