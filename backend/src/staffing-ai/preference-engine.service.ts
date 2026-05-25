import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type EmployeePreferenceAnalysis = {
  userId: number;
  employeeName: string;

  preferredHours: string[];
  preferredDays: string[];
  preferredWorkTypes: string[];

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
      where: {
        cinemaId: params.cinemaId,
        role: 'EMPLOYEE',
      },
      include: {
        shifts: {
          where: {
            startTime: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            workType: true,
          },
        },
        targetedStaffingRequests: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        acceptedTrades: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        rejectedTrades: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        staffingAiProfile: true,
      },
    });

    const analyses: EmployeePreferenceAnalysis[] = [];

    for (const user of users) {
      const reasoning: string[] = [];

      const hourCounts = new Map<number, number>();
      const dayCounts = new Map<number, number>();
      const workTypeCounts = new Map<string, number>();

      for (const shift of user.shifts) {
        const start = new Date(shift.startTime);
        const hour = start.getHours();
        const day = start.getDay();

        hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
        dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);

        if (shift.workType?.name) {
          workTypeCounts.set(
            shift.workType.name,
            (workTypeCounts.get(shift.workType.name) ?? 0) + 1,
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

      const preferredWorkTypes = Array.from(workTypeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([workType]) => workType);

      const acceptedRequests = user.targetedStaffingRequests.filter(
        (request) => request.status === 'ACCEPTED',
      ).length;

      const rejectedRequests = user.targetedStaffingRequests.filter(
        (request) => request.status === 'REJECTED',
      ).length;

      const totalRequests = acceptedRequests + rejectedRequests;

      const acceptanceRate =
        totalRequests === 0 ? 0 : acceptedRequests / totalRequests;

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

      if (preferredWorkTypes.length > 0) {
        reasoning.push(
          `Foretrukne arbejdstyper: ${preferredWorkTypes.join(', ')}`,
        );
      }

      satisfactionPrediction = Math.max(
        0,
        Math.min(100, satisfactionPrediction),
      );

      await this.prisma.staffingAiProfile.upsert({
        where: {
          userId: user.id,
        },
        create: {
          userId: user.id,
          acceptanceRate,
          rejectionRate:
            totalRequests === 0 ? 0 : rejectedRequests / totalRequests,
          preferredHours: preferredHours.join(','),
          preferredWorkTypes: preferredWorkTypes.join(','),
          totalRequests,
          acceptedRequests,
          rejectedRequests,
          lastAcceptedAt:
            acceptedRequests > 0
              ? this.getLatestRequestDate(
                  user.targetedStaffingRequests,
                  'ACCEPTED',
                )
              : undefined,
          lastRejectedAt:
            rejectedRequests > 0
              ? this.getLatestRequestDate(
                  user.targetedStaffingRequests,
                  'REJECTED',
                )
              : undefined,
        },
        update: {
          acceptanceRate,
          rejectionRate:
            totalRequests === 0 ? 0 : rejectedRequests / totalRequests,
          preferredHours: preferredHours.join(','),
          preferredWorkTypes: preferredWorkTypes.join(','),
          totalRequests,
          acceptedRequests,
          rejectedRequests,
          lastAcceptedAt:
            acceptedRequests > 0
              ? this.getLatestRequestDate(
                  user.targetedStaffingRequests,
                  'ACCEPTED',
                )
              : undefined,
          lastRejectedAt:
            rejectedRequests > 0
              ? this.getLatestRequestDate(
                  user.targetedStaffingRequests,
                  'REJECTED',
                )
              : undefined,
        },
      });

      analyses.push({
        userId: user.id,
        employeeName: `${user.firstName} ${user.lastName}`,
        preferredHours,
        preferredDays,
        preferredWorkTypes,
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

  private getLatestRequestDate(
    requests: { status: string; createdAt: Date }[],
    status: string,
  ) {
    const matchingRequests = requests
      .filter((request) => request.status === status)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    return matchingRequests[0]?.createdAt;
  }
}
