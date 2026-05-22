import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type AuthUser = {
  sub: number;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number;
  canManagePayroll?: boolean;
};

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  private ensurePayrollAccess(user: AuthUser) {
    if (user.role === 'MASTER') return;

    if (user.role === 'ADMIN') return;

    throw new ForbiddenException('Du har ikke adgang til løndata');
  }

  private getCinemaFilter(user: AuthUser) {
    if (user.role === 'MASTER') {
      return {};
    }

    return {
      cinemaId: user.cinemaId,
    };
  }

  async getPayrollReport(
    user: AuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
  ) {
    this.ensurePayrollAccess(user);

    const entries = await this.prisma.timeEntry.findMany({
      where: {
        ...this.getCinemaFilter(user),

        ...(userId
          ? {
              userId: Number(userId),
            }
          : {}),

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

    const grouped = new Map<
      number,
      {
        userId: number;
        name: string;
        email: string;
        totalHours: number;
        entries: {
          id: number;
          date: string;
          clockIn: string;
          clockOut: string;
          hours: number;
          workType: string;
          status: string;
          note: string | null;
          adminNote: string | null;
        }[];
      }
    >();

    for (const entry of entries) {
      if (!entry.clockOut) continue;

      const hours =
        (entry.clockOut.getTime() - entry.clockIn.getTime()) / 1000 / 60 / 60;

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
        id: entry.id,
        date: entry.clockIn.toISOString().slice(0, 10),
        clockIn: entry.clockIn.toISOString(),
        clockOut: entry.clockOut.toISOString(),
        hours: Number(hours.toFixed(2)),
        workType: entry.shift?.workType?.name || '-',
        status: entry.status,
        note: entry.note,
        adminNote: entry.adminNote,
      });
    }

    return Array.from(grouped.values()).map((employee) => ({
      ...employee,
      totalHours: Number(employee.totalHours.toFixed(2)),
    }));
  }

  async exportPayrollCsv(
    user: AuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
  ) {
    const report = await this.getPayrollReport(
      user,
      startDate,
      endDate,
      userId,
    );

    const rows = [
      [
        'Medarbejder',
        'Email',
        'Dato',
        'Ind',
        'Ud',
        'Timer',
        'Arbejdstype',
        'Status',
        'Note',
        'Admin note',
      ],
    ];

    for (const employee of report) {
      for (const entry of employee.entries) {
        rows.push([
          employee.name,
          employee.email,
          entry.date,
          entry.clockIn,
          entry.clockOut,
          entry.hours.toString().replace('.', ','),
          entry.workType,
          entry.status,
          entry.note || '',
          entry.adminNote || '',
        ]);
      }
    }

    return rows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'),
      )
      .join('\n');
  }
}
