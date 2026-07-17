import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  calculateCinemaRequestRates,
  getActiveCinemaUserWhere,
} from './staffing-ai-cinema-access';

type RetentionRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type EmployeeRetentionRisk = {
  userId: number;
  employeeName: string;
  burnoutRisk: number;
  churnRisk: number;
  dissatisfactionRisk: number;
  workloadStressScore: number;
  riskLevel: RetentionRiskLevel;
  warnings: string[];
  recommendations: string[];
};

@Injectable()
export class RetentionEngineService {
  constructor(private prisma: PrismaService) {}

  async analyzeRetentionRisk(params: {
    cinemaId: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<EmployeeRetentionRisk[]> {
    const endDate = params.endDate ?? new Date();
    const startDate =
      params.startDate ??
      new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
    const users = await this.prisma.user.findMany({
      where: getActiveCinemaUserWhere({
        cinemaId: params.cinemaId,
        role: Role.EMPLOYEE,
      }),
      include: {
        shifts: {
          where: {
            cinemaId: params.cinemaId,
            startTime: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        targetedStaffingRequests: {
          where: {
            cinemaId: params.cinemaId,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            status: true,
            type: true,
          },
        },
        staffingAiProfile: true,
      },
    });

    return users
      .map((user) => {
        const warnings: string[] = [];
        const recommendations: string[] = [];
        let burnoutRisk = 0;
        let churnRisk = 0;
        let dissatisfactionRisk = 0;
        let workloadStressScore = 0;
        const totalHours = user.shifts.reduce((sum, shift) => {
          const start = new Date(shift.startTime);
          const end = new Date(shift.endTime);
          return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        }, 0);
        const weekendShifts = user.shifts.filter((shift) => {
          const day = new Date(shift.startTime).getDay();
          return day === 0 || day === 5 || day === 6;
        }).length;
        const lateShifts = user.shifts.filter((shift) => {
          const endHour = new Date(shift.endTime).getHours();
          return endHour >= 23 || endHour <= 5;
        }).length;
        const requestRates = calculateCinemaRequestRates(
          user.targetedStaffingRequests,
        );

        if (totalHours >= 180) {
          burnoutRisk += 40;
          workloadStressScore += 40;
          warnings.push(`${totalHours.toFixed(1)} timer i perioden`);
          recommendations.push('Reducer samlet timetal for medarbejderen.');
        } else if (totalHours >= 140) {
          burnoutRisk += 25;
          workloadStressScore += 25;
          warnings.push(`Forhøjet timetal: ${totalHours.toFixed(1)} timer`);
        }
        if (weekendShifts >= 8) {
          dissatisfactionRisk += 25;
          workloadStressScore += 15;
          warnings.push(`${weekendShifts} weekendvagter`);
          recommendations.push('Fordel weekendvagter mere ligeligt.');
        }
        if (lateShifts >= 6) {
          burnoutRisk += 25;
          dissatisfactionRisk += 20;
          warnings.push(`${lateShifts} sene/natte-vagter`);
          recommendations.push('Reducer sene vagter eller giv recovery days.');
        }
        if (requestRates.rejectionRate >= 0.6 && requestRates.totalRequests >= 3) {
          churnRisk += 30;
          dissatisfactionRisk += 25;
          warnings.push(
            `Høj afvisningsrate på staffing requests (${Math.round(
              requestRates.rejectionRate * 100,
            )}%)`,
          );
          recommendations.push(
            'Undersøg om medarbejderen får for mange uønskede requests.',
          );
        }

        const profile = user.staffingAiProfile;
        if (profile?.fatigueScore && profile.fatigueScore >= 60) {
          burnoutRisk += 25;
          workloadStressScore += 20;
          warnings.push(`Høj fatigue score: ${profile.fatigueScore}`);
        }
        if (profile?.overtimeScore && profile.overtimeScore >= 60) {
          burnoutRisk += 20;
          workloadStressScore += 20;
          warnings.push(`Høj overtime score: ${profile.overtimeScore}`);
        }

        const totalRisk =
          burnoutRisk + churnRisk + dissatisfactionRisk + workloadStressScore;
        let riskLevel: RetentionRiskLevel = 'LOW';
        if (totalRisk >= 180) {
          riskLevel = 'CRITICAL';
        } else if (totalRisk >= 120) {
          riskLevel = 'HIGH';
        } else if (totalRisk >= 70) {
          riskLevel = 'MEDIUM';
        }
        if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
          recommendations.push(
            'Planlæg lavere belastning og mere stabile vagter i næste periode.',
          );
        }

        return {
          userId: user.id,
          employeeName: `${user.firstName} ${user.lastName}`,
          burnoutRisk,
          churnRisk,
          dissatisfactionRisk,
          workloadStressScore,
          riskLevel,
          warnings,
          recommendations,
        };
      })
      .sort((a, b) => {
        const aRisk =
          a.burnoutRisk +
          a.churnRisk +
          a.dissatisfactionRisk +
          a.workloadStressScore;
        const bRisk =
          b.burnoutRisk +
          b.churnRisk +
          b.dissatisfactionRisk +
          b.workloadStressScore;
        return bRisk - aRisk;
      });
  }
}
