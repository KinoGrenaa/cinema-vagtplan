import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type EmployeeFairnessScore = {
  userId: number;
  employeeName: string;
  totalHours: number;
  weekendShifts: number;
  eveningShifts: number;
  lateShifts: number;
  fairnessScore: number;
  dissatisfactionRisk: number;
  reasoning: string[];
};

@Injectable()
export class FairnessEngineService {
  constructor(private prisma: PrismaService) {}

  async analyzeFairness(params: {
    cinemaId: number;
    startDate: Date;
    endDate: Date;
  }) {
    const users = await this.prisma.user.findMany({
      where: {
        cinemaId: params.cinemaId,
        role: 'EMPLOYEE',
      },
      include: {
        shifts: {
          where: {
            startTime: {
              gte: params.startDate,
              lte: params.endDate,
            },
          },
        },
        staffingAiProfile: true,
      },
    });

    const employeeScores: EmployeeFairnessScore[] = users.map((user) => {
      const reasoning: string[] = [];

      let totalHours = 0;
      let weekendShifts = 0;
      let eveningShifts = 0;
      let lateShifts = 0;

      for (const shift of user.shifts) {
        const start = new Date(shift.startTime);
        const end = new Date(shift.endTime);

        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

        totalHours += hours;

        const day = start.getDay();
        const startHour = start.getHours();
        const endHour = end.getHours();

        if (day === 0 || day === 5 || day === 6) {
          weekendShifts += 1;
        }

        if (startHour >= 17) {
          eveningShifts += 1;
        }

        if (endHour >= 23 || endHour <= 5) {
          lateShifts += 1;
        }
      }

      let dissatisfactionRisk = 0;

      if (weekendShifts >= 4) {
        dissatisfactionRisk += 25;
        reasoning.push(`${weekendShifts} weekendvagter`);
      }

      if (eveningShifts >= 5) {
        dissatisfactionRisk += 20;
        reasoning.push(`${eveningShifts} aftenvagter`);
      }

      if (lateShifts >= 3) {
        dissatisfactionRisk += 25;
        reasoning.push(`${lateShifts} sene vagter`);
      }

      if (totalHours >= 120) {
        dissatisfactionRisk += 30;
        reasoning.push(`${totalHours.toFixed(1)} timer i perioden`);
      }

      const profileFatigue = user.staffingAiProfile?.fatigueScore ?? 0;

      if (profileFatigue >= 60) {
        dissatisfactionRisk += 20;
        reasoning.push(`Høj fatigue score: ${profileFatigue}`);
      }

      const fairnessScore = Math.max(0, 100 - dissatisfactionRisk);

      return {
        userId: user.id,
        employeeName: `${user.firstName} ${user.lastName}`,
        totalHours,
        weekendShifts,
        eveningShifts,
        lateShifts,
        fairnessScore,
        dissatisfactionRisk,
        reasoning,
      };
    });

    const averageFairness =
      employeeScores.length === 0
        ? 100
        : employeeScores.reduce(
            (sum, employee) => sum + employee.fairnessScore,
            0,
          ) / employeeScores.length;

    const fairnessWarnings = employeeScores
      .filter((employee) => employee.dissatisfactionRisk >= 50)
      .map(
        (employee) =>
          `${employee.employeeName} har høj dissatisfaction-risk (${employee.dissatisfactionRisk})`,
      );

    const recommendations: string[] = [];

    if (averageFairness < 70) {
      recommendations.push(
        'Fordelingen af vagter bør balanceres bedre mellem medarbejderne.',
      );
    }

    if (fairnessWarnings.length > 0) {
      recommendations.push(
        'Reducer weekend-, aften- eller sene vagter for belastede medarbejdere.',
      );
    }

    return {
      fairnessScore: Math.round(averageFairness),
      employeeScores,
      fairnessWarnings,
      recommendations,
    };
  }
}
