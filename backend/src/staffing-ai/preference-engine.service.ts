import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  calculateCinemaRequestRates,
  getActiveCinemaUserWhere,
} from './staffing-ai-cinema-access';

type EmployeePreferenceAnalysis = {
  userId: number;
  employeeName: string;
  preferredHours: string[];
  preferredDays: string[];
  preferredJobFunctions: string[];
  acceptedRequests: number;
  rejectedRequests: number;
  acceptanceRate: number;
  satisfactionPrediction: number;
  reasoning: string[];
};

@Injectable()
export class PreferenceEngineService {
  constructor(private prisma: PrismaService) {}

  async analyzeEmployeePreferences(params: {
    cinemaId: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<EmployeePreferenceAnalysis[]> {
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
          include: {
            jobFunction: true,
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
      },
    });
    const analyses: EmployeePreferenceAnalysis[] = [];

    for (const user of users) {
      const reasoning: string[] = [];
      const hourCounts = new Map<number, number>();
      const dayCounts = new Map<number, number>();
      const jobFunctionCounts = new Map<string, number>();

      for (const shift of user.shifts) {
        const start = new Date(shift.startTime);
        const hour = start.getHours();
        const day = start.getDay();
        hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
        dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);

        if (shift.jobFunction?.name) {
          jobFunctionCounts.set(
            shift.jobFunction.name,
            (jobFunctionCounts.get(shift.jobFunction.name) ?? 0) + 1,
          );
        }
      }

      const preferredHours = Array.from(hourCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([hour]) => `${String(hour).padStart(2, '0')}:00`);
      const preferredDays = Array.from(dayCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([day]) => this.getDayName(day));
      const preferredJobFunctions = Array.from(jobFunctionCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([jobFunction]) => jobFunction);
      const requestRates = calculateCinemaRequestRates(
        user.targetedStaffingRequests,
      );
      const { acceptedRequests, rejectedRequests, acceptanceRate } = requestRates;
      let satisfactionPrediction = 70;

      if (acceptanceRate >= 0.75) {
        satisfactionPrediction += 15;
        reasoning.push('Høj accept-rate på staffing requests');
      }
      if (acceptanceRate > 0 && acceptanceRate < 0.35) {
        satisfactionPrediction -= 20;
        reasoning.push('Lav accept-rate på staffing requests');
      }
      if (rejectedRequests >= 5) {
        satisfactionPrediction -= 15;
        reasoning.push('Mange afviste staffing requests');
      }
      if (preferredHours.length > 0) {
        reasoning.push(`Foretrukne timer: ${preferredHours.join(', ')}`);
      }
      if (preferredDays.length > 0) {
        reasoning.push(`Foretrukne dage: ${preferredDays.join(', ')}`);
      }
      if (preferredJobFunctions.length > 0) {
        reasoning.push(
          `Foretrukne jobfunktioner: ${preferredJobFunctions.join(', ')}`,
        );
      }

      satisfactionPrediction = Math.max(
        0,
        Math.min(100, satisfactionPrediction),
      );
      analyses.push({
        userId: user.id,
        employeeName: `${user.firstName} ${user.lastName}`,
        preferredHours,
        preferredDays,
        preferredJobFunctions,
        acceptedRequests,
        rejectedRequests,
        acceptanceRate,
        satisfactionPrediction,
        reasoning,
      });
    }

    return analyses.sort(
      (a, b) => b.satisfactionPrediction - a.satisfactionPrediction,
    );
  }

  private getDayName(day: number) {
    const days = [
      'Søndag',
      'Mandag',
      'Tirsdag',
      'Onsdag',
      'Torsdag',
      'Fredag',
      'Lørdag',
    ];
    return days[day] ?? 'Ukendt';
  }
}
