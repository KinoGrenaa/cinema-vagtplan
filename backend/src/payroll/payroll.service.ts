import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  async getPayrollReport(startDate: string, endDate: string) {
    const entries = await this.prisma.timeEntry.findMany({
      where: {
        clockIn: {
          gte: new Date(`${startDate}T00:00:00.000Z`),
          lte: new Date(`${endDate}T23:59:59.999Z`),
        },
        clockOut: {
          not: null,
        },
      },
      include: {
        user: true,
        shift: {
          include: {
            workType: true,
          },
        },
      },
      orderBy: {
        clockIn: 'asc',
      },
    });

    const grouped = new Map<number, {
      userId: number;
      name: string;
      email: string;
      totalHours: number;
      entries: {
        date: string;
        clockIn: string;
        clockOut: string;
        hours: number;
        workType: string;
      }[];
    }>();

    for (const entry of entries) {
      if (!entry.clockOut) continue;

      const hours =
        (entry.clockOut.getTime() - entry.clockIn.getTime()) /
        1000 /
        60 /
        60;

      if (!grouped.has(entry.userId)) {
        grouped.set(entry.userId, {
          userId: entry.userId,
          name: `${entry.user.firstName} ${entry.user.lastName}`,
          email: entry.user.email,
          totalHours: 0,
          entries: [],
        });
      }

      const userGroup = grouped.get(entry.userId);

      if (!userGroup) continue;

      userGroup.totalHours += hours;

      userGroup.entries.push({
        date: entry.clockIn.toISOString().slice(0, 10),
        clockIn: entry.clockIn.toISOString(),
        clockOut: entry.clockOut.toISOString(),
        hours,
        workType: entry.shift?.workType?.name || '-',
      });
    }

    return Array.from(grouped.values());
  }
}