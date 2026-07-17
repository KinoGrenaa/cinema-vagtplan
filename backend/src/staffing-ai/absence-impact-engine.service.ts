import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FairnessEngineService } from './fairness-engine.service';
import { FatigueEngineService } from './fatigue-engine.service';
import { PreferenceEngineService } from './preference-engine.service';
import { RetentionEngineService } from './retention-engine.service';
import { getActiveCinemaUserWhere } from './staffing-ai-cinema-access';

@Injectable()
export class AbsenceImpactEngineService {
  constructor(
    private prisma: PrismaService,
    private fairnessEngine: FairnessEngineService,
    private fatigueEngine: FatigueEngineService,
    private preferenceEngine: PreferenceEngineService,
    private retentionEngine: RetentionEngineService,
  ) {}

  async analyzeLeaveImpact(params: {
    leaveRequestId?: number;
    userId: number;
    cinemaId: number;
    startDate: Date;
    endDate: Date;
  }) {
    const { userId, cinemaId, startDate, endDate } = params;
    const shiftsImpacted = await this.prisma.shift.findMany({
      where: {
        cinemaId,
        userId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: true,
        workType: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });
    const impactedDays = this.calculateDayCount(startDate, endDate);
    const replacementSuggestions: any[] = [];
    let staffingRiskScore = 0;

    for (const shift of shiftsImpacted) {
      const replacementCandidates = await this.findReplacementCandidates({
        cinemaId,
        shiftId: shift.id,
        excludedUserId: userId,
      });
      replacementSuggestions.push({
        shiftId: shift.id,
        shiftStart: shift.startTime,
        shiftEnd: shift.endTime,
        workType: shift.workType?.name || 'Ukendt',
        candidates: replacementCandidates,
      });

      if (replacementCandidates.length === 0) {
        staffingRiskScore += 30;
      } else if (replacementCandidates.length <= 2) {
        staffingRiskScore += 15;
      } else {
        staffingRiskScore += 5;
      }
    }

    return {
      impactedShiftCount: shiftsImpacted.length,
      impactedDays,
      staffingRiskScore,
      vulnerabilityLevel: this.calculateVulnerabilityLevel(staffingRiskScore),
      shiftsImpacted,
      replacementSuggestions,
      warnings: this.generateWarnings({
        staffingRiskScore,
        impactedShiftCount: shiftsImpacted.length,
        impactedDays,
      }),
    };
  }

  async findReplacementCandidates(params: {
    cinemaId: number;
    shiftId: number;
    excludedUserId?: number;
  }) {
    const { cinemaId, shiftId, excludedUserId } = params;
    const shift = await this.prisma.shift.findFirst({
      where: {
        id: shiftId,
        cinemaId,
      },
      include: {
        workType: true,
      },
    });

    if (!shift) {
      return [];
    }

    const analysisStartDate = new Date(
      shift.startTime.getTime() - 90 * 24 * 60 * 60 * 1000,
    );
    const analysisEndDate = new Date(
      shift.endTime.getTime() + 14 * 24 * 60 * 60 * 1000,
    );
    const [fairnessAnalysis, preferenceAnalysis, retentionAnalysis] =
      await Promise.all([
        this.fairnessEngine.analyzeFairness({
          cinemaId,
          startDate: analysisStartDate,
          endDate: analysisEndDate,
        }),
        this.preferenceEngine.analyzeEmployeePreferences({
          cinemaId,
          startDate: analysisStartDate,
          endDate: analysisEndDate,
        }),
        this.retentionEngine.analyzeRetentionRisk({
          cinemaId,
          startDate: analysisStartDate,
          endDate: analysisEndDate,
        }),
      ]);
    const users = await this.prisma.user.findMany({
      where: {
        ...getActiveCinemaUserWhere({
          cinemaId,
          role: Role.EMPLOYEE,
        }),
        ...(excludedUserId
          ? {
              id: {
                not: excludedUserId,
              },
            }
          : {}),
      },
    });
    const candidates: any[] = [];

    for (const user of users) {
      const conflictingShift = await this.prisma.shift.findFirst({
        where: {
          userId: user.id,
          startTime: {
            lt: shift.endTime,
          },
          endTime: {
            gt: shift.startTime,
          },
        },
      });

      if (conflictingShift) {
        continue;
      }

      const fairness = fairnessAnalysis.employeeScores.find(
        (item) => item.userId === user.id,
      );
      const preferences = preferenceAnalysis.find(
        (item) => item.userId === user.id,
      );
      const retention = retentionAnalysis.find(
        (item) => item.userId === user.id,
      );
      const fatigue = await this.fatigueEngine.calculateFatigueScore(user.id);
      const retentionRiskScore =
        (retention?.burnoutRisk ?? 0) +
        (retention?.churnRisk ?? 0) +
        (retention?.dissatisfactionRisk ?? 0) +
        (retention?.workloadStressScore ?? 0);
      const preferenceMatch =
        !!shift.workType?.name &&
        (preferences?.preferredWorkTypes ?? []).includes(shift.workType.name);
      let score = 100;
      score -= (100 - (fairness?.fairnessScore ?? 100)) * 0.2;
      score -= fatigue.fatigueScore * 0.3;
      score -= retentionRiskScore * 0.2;
      if (preferenceMatch) {
        score += 15;
      }
      if (fatigue.overtimeScore > 70) {
        score -= 25;
      }

      candidates.push({
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        replacementScore: Math.round(score),
        fairnessScore: fairness?.fairnessScore ?? 100,
        fatigueScore: fatigue.fatigueScore,
        overtimeScore: fatigue.overtimeScore,
        retentionRiskScore,
        preferenceMatch,
      });
    }

    return candidates
      .sort((a, b) => b.replacementScore - a.replacementScore)
      .slice(0, 5);
  }

  private calculateDayCount(startDate: Date, endDate: Date) {
    const diff = endDate.getTime() - startDate.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  private calculateVulnerabilityLevel(riskScore: number) {
    if (riskScore >= 80) return 'CRITICAL';
    if (riskScore >= 50) return 'HIGH';
    if (riskScore >= 25) return 'MEDIUM';
    return 'LOW';
  }

  private generateWarnings(params: {
    staffingRiskScore: number;
    impactedShiftCount: number;
    impactedDays: number;
  }) {
    const warnings: string[] = [];
    if (params.staffingRiskScore >= 80) {
      warnings.push('Kritisk bemandingsrisiko i perioden.');
    }
    if (params.impactedShiftCount >= 5) {
      warnings.push('Mange vagter bliver påvirket.');
    }
    if (params.impactedDays >= 7) {
      warnings.push('Lang fraværsperiode kan påvirke driftstabilitet.');
    }
    return warnings;
  }
}
