import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FatigueEngineService {
  constructor(private prisma: PrismaService) {}

  private getCopenhagenDateParts(date: Date) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Copenhagen',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
      hourCycle: 'h23',
    }).formatToParts(date);

    const getPart = (type: string) =>
      parts.find((part) => part.type === type)?.value ?? '';

    return {
      year: getPart('year'),
      month: getPart('month'),
      day: getPart('day'),
      hour: getPart('hour'),
    };
  }

  private dateToCopenhagenDateKey(date: Date) {
    const parts = this.getCopenhagenDateParts(date);

    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  private getCopenhagenHour(date: Date) {
    const hour = Number(this.getCopenhagenDateParts(date).hour);

    return Number.isNaN(hour) ? 0 : hour;
  }

  private dateKeyToUtcDate(dateKey: string) {
    const [year, month, day] = dateKey.split('-').map(Number);

    return new Date(Date.UTC(year, month - 1, day));
  }

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

    const workedDates = new Set<string>(
      shifts.map((shift) =>
        this.dateToCopenhagenDateKey(new Date(shift.startTime)),
      ),
    );

    const sortedDates = Array.from(workedDates).sort();

    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        consecutiveDays = 1;
        maxConsecutiveDays = 1;
        continue;
      }

      const prev = this.dateKeyToUtcDate(sortedDates[i - 1]);
      const current = this.dateKeyToUtcDate(sortedDates[i]);

      const diffDays =
        (current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays === 1) {
        consecutiveDays += 1;
      } else {
        consecutiveDays = 1;
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
      const endHour = this.getCopenhagenHour(new Date(shift.endTime));

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
