import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FatigueEngineService {
  constructor(private prisma: PrismaService) {}

  async calculateFatigueScore(userId: number): Promise<{
    fatigueScore: number;
    overtimeScore: number;
    reasoning: string[];
  }> {
    const reasoning: string[] = [];

    let fatigueScore = 0;
    let overtimeScore = 0;

    const now = new Date();

    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const shifts = await this.prisma.shift.findMany({
      where: {
        userId,

        startTime: {
          gte: last30Days,
        },
      },

      orderBy: {
        startTime: 'asc',
      },
    });

    const totalHours = shifts.reduce((sum, shift) => {
      const hours =
        (new Date(shift.endTime).getTime() -
          new Date(shift.startTime).getTime()) /
        (1000 * 60 * 60);

      return sum + hours;
    }, 0);

    if (totalHours > 160) {
      overtimeScore += 60;

      reasoning.push(
        `Højt timetal sidste 30 dage (${totalHours.toFixed(1)} timer)`,
      );
    } else if (totalHours > 120) {
      overtimeScore += 30;

      reasoning.push(
        `Forhøjet timetal sidste 30 dage (${totalHours.toFixed(1)} timer)`,
      );
    }

    let consecutiveDays = 0;
    let maxConsecutiveDays = 0;

    const workedDates = new Set(
      shifts.map((shift) =>
        new Date(shift.startTime).toISOString().slice(0, 10),
      ),
    );

    const sortedDates = Array.from(workedDates).sort();

    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1]);
      const current = new Date(sortedDates[i]);

      const diffDays =
        (current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays <= 1) {
        consecutiveDays += 1;
      } else {
        consecutiveDays = 0;
      }

      maxConsecutiveDays = Math.max(maxConsecutiveDays, consecutiveDays);
    }

    if (maxConsecutiveDays >= 6) {
      fatigueScore += 50;

      reasoning.push(`${maxConsecutiveDays} sammenhængende arbejdsdage`);
    } else if (maxConsecutiveDays >= 4) {
      fatigueScore += 25;

      reasoning.push(`${maxConsecutiveDays} arbejdsdage i træk`);
    }

    const lateShifts = shifts.filter((shift) => {
      const endHour = new Date(shift.endTime).getHours();

      return endHour >= 23 || endHour <= 5;
    });

    if (lateShifts.length >= 5) {
      fatigueScore += 30;

      reasoning.push(`${lateShifts.length} sene/natte-vagter sidste 30 dage`);
    }

    const profile = await this.prisma.staffingAiProfile.upsert({
      where: {
        userId,
      },

      create: {
        userId,
        fatigueScore,
        overtimeScore,
      },

      update: {
        fatigueScore,
        overtimeScore,
      },
    });

    reasoning.push(`Fatigue score opdateret til ${profile.fatigueScore}`);

    return {
      fatigueScore,
      overtimeScore,
      reasoning,
    };
  }
}
