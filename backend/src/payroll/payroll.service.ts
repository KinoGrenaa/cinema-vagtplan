import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { PayrollRulesService } from './payroll-rules.service';

type AuthUser = {
  sub: number;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number;
  canManagePayroll?: boolean;
};

type PayrollData = {
  payrollCode: string;
  exportCode: string;
  payrollName: string;
};

type PayrollExportSegment = {
  hours: number;
  exportCode: string;
  payrollName: string;
};

type TimeEntryDeviationType =
  | 'NONE'
  | 'OPEN_ENTRY'
  | 'MANUAL_WITHOUT_SHIFT'
  | 'EARLY_CLOCK_IN'
  | 'LATE_CLOCK_IN'
  | 'EARLY_CLOCK_OUT'
  | 'LATE_CLOCK_OUT'
  | 'TIME_DIFFERENCE';

type TimeEntryDeviation = {
  hasDeviation: boolean;
  requiresNote: boolean;
  types: TimeEntryDeviationType[];
  plannedMinutes: number | null;
  registeredMinutes: number | null;
  differenceMinutes: number | null;
  clockInDeviationMinutes: number | null;
  clockOutDeviationMinutes: number | null;
  messages: string[];
};

@Injectable()
export class PayrollService {
  private readonly deviationGraceMinutes = 5;

  private formatDeviationMinutes(minutes: number): string {
    const absoluteMinutes = Math.abs(minutes);

    const hours = Math.floor(absoluteMinutes / 60);
    const remainingMinutes = absoluteMinutes % 60;

    if (hours === 0) {
      return `${remainingMinutes} minutter`;
    }

    if (remainingMinutes === 0) {
      return `${hours} timer`;
    }

    return `${hours} timer ${remainingMinutes} minutter`;
  }

  private minutesBetween(start: Date, end: Date) {
    return Math.round((end.getTime() - start.getTime()) / 60000);
  }

  private analyzeDeviation(entry: any): TimeEntryDeviation {
    const messages: string[] = [];
    const types: TimeEntryDeviationType[] = [];
    const shift = entry.shift;

    if (!entry.clockOut) {
      return {
        hasDeviation: true,
        requiresNote: false,
        types: ['OPEN_ENTRY'],
        plannedMinutes: shift
          ? this.minutesBetween(shift.startTime, shift.endTime)
          : null,
        registeredMinutes: null,
        differenceMinutes: null,
        clockInDeviationMinutes: shift
          ? this.minutesBetween(shift.startTime, entry.clockIn)
          : null,
        clockOutDeviationMinutes: null,
        messages: ['Tidsregistreringen er stadig åben'],
      };
    }

    if (!shift) {
      return {
        hasDeviation: true,
        requiresNote: true,
        types: ['MANUAL_WITHOUT_SHIFT'],
        plannedMinutes: null,
        registeredMinutes: this.minutesBetween(entry.clockIn, entry.clockOut),
        differenceMinutes: null,
        clockInDeviationMinutes: null,
        clockOutDeviationMinutes: null,
        messages: ['Tidsregistreringen er ikke tilknyttet en planlagt vagt'],
      };
    }

    const plannedMinutes = this.minutesBetween(shift.startTime, shift.endTime);
    const registeredMinutes = this.minutesBetween(
      entry.clockIn,
      entry.clockOut,
    );
    const differenceMinutes = registeredMinutes - plannedMinutes;
    const clockInDeviationMinutes = this.minutesBetween(
      shift.startTime,
      entry.clockIn,
    );
    const clockOutDeviationMinutes = this.minutesBetween(
      shift.endTime,
      entry.clockOut,
    );

    if (clockInDeviationMinutes > this.deviationGraceMinutes) {
      types.push('LATE_CLOCK_IN');
      messages.push(
        `Mødt ${this.formatDeviationMinutes(clockInDeviationMinutes)} for sent`,
      );
    }

    if (clockInDeviationMinutes < -this.deviationGraceMinutes) {
      types.push('EARLY_CLOCK_IN');
      messages.push(
        `Mødt ${this.formatDeviationMinutes(clockInDeviationMinutes)} før planlagt`,
      );
    }

    if (clockOutDeviationMinutes < -this.deviationGraceMinutes) {
      types.push('EARLY_CLOCK_OUT');
      messages.push(
        `Gået ${this.formatDeviationMinutes(clockOutDeviationMinutes)} efter planlagt`,
      );
    }

    if (clockOutDeviationMinutes > this.deviationGraceMinutes) {
      types.push('LATE_CLOCK_OUT');
      messages.push(
        `Gået ${this.formatDeviationMinutes(clockOutDeviationMinutes)} efter planlagt`,
      );
    }

    if (
      types.length === 0 &&
      Math.abs(differenceMinutes) > this.deviationGraceMinutes
    ) {
      types.push('TIME_DIFFERENCE');
      messages.push(
        `Registreret tid afviger med ${this.formatDeviationMinutes(differenceMinutes)} fra vagtplanen`,
      );
    }

    if (types.length === 0) {
      types.push('NONE');
      messages.push('Ingen væsentlig afvigelse');
    }

    const hasDeviation = types.some((type) => type !== 'NONE');

    return {
      hasDeviation,
      requiresNote: hasDeviation,
      types,
      plannedMinutes,
      registeredMinutes,
      differenceMinutes,
      clockInDeviationMinutes,
      clockOutDeviationMinutes,
      messages,
    };
  }

  constructor(
    private prisma: PrismaService,
    private payrollRulesService: PayrollRulesService,
  ) {}

  private ensurePayrollAccess(user: AuthUser) {
    if (user.role === 'MASTER') return;
    if (user.role === 'ADMIN') return;
    if (user.canManagePayroll) return;

    throw new ForbiddenException('Du har ikke adgang til løndata');
  }

  private ensurePayrollExportAccess(user: AuthUser) {
    if (user.role === 'MASTER') return;
    if (user.role === 'ADMIN') return;
    if (user.canManagePayroll) return;

    throw new ForbiddenException('Du har ikke adgang til eksport');
  }

  private ensureMaster(user: AuthUser) {
    if (user.role !== 'MASTER' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Kun ADMIN eller MASTER kan låse op igen');
    }
  }

  private getCinemaFilter(user: AuthUser) {
    if (user.role === 'MASTER') return {};
    return { cinemaId: user.cinemaId };
  }

  private getPeriodDates(startDate: string, endDate: string) {
    return {
      start: new Date(`${startDate}T00:00:00.000Z`),
      end: new Date(`${endDate}T23:59:59.999Z`),
    };
  }

  private dateToDateString(date: Date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private createUtcDate(year: number, month: number, day: number) {
    return new Date(Date.UTC(year, month, day));
  }

  private addDays(date: Date, days: number) {
    return this.createUtcDate(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + days,
    );
  }

  private getDaysInMonth(year: number, month: number) {
    return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  }

  private clampDay(year: number, month: number, day: number) {
    return Math.min(Math.max(day, 1), this.getDaysInMonth(year, month));
  }

  private calculatePayrollPeriodForDate(cinema: any, referenceDate: Date) {
    const model = cinema.payrollPeriodModel || 'CALENDAR_MONTH';

    const reference = this.createUtcDate(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate(),
    );

    if (model === 'CALENDAR_MONTH') {
      const start = this.createUtcDate(
        reference.getUTCFullYear(),
        reference.getUTCMonth(),
        1,
      );

      const end = this.createUtcDate(
        reference.getUTCFullYear(),
        reference.getUTCMonth() + 1,
        0,
      );

      return {
        startDate: this.dateToDateString(start),
        endDate: this.dateToDateString(end),
      };
    }

    if (model === 'BIWEEKLY') {
      const anchor = cinema.payrollPeriodAnchorDate
        ? this.createUtcDate(
            cinema.payrollPeriodAnchorDate.getUTCFullYear(),
            cinema.payrollPeriodAnchorDate.getUTCMonth(),
            cinema.payrollPeriodAnchorDate.getUTCDate(),
          )
        : this.createUtcDate(
            reference.getUTCFullYear(),
            reference.getUTCMonth(),
            1,
          );

      const msPerDay = 24 * 60 * 60 * 1000;
      const daysSinceAnchor = Math.floor(
        (reference.getTime() - anchor.getTime()) / msPerDay,
      );

      const cycleOffset = Math.floor(daysSinceAnchor / 14) * 14;
      const start = this.addDays(anchor, cycleOffset);
      const end = this.addDays(start, 13);

      return {
        startDate: this.dateToDateString(start),
        endDate: this.dateToDateString(end),
      };
    }

    const startDay = cinema.payrollPeriodStartDay || 1;
    const endDay = cinema.payrollPeriodEndDay || 31;

    const referenceDay = reference.getUTCDate();

    if (startDay <= endDay) {
      const start = this.createUtcDate(
        reference.getUTCFullYear(),
        reference.getUTCMonth(),
        this.clampDay(
          reference.getUTCFullYear(),
          reference.getUTCMonth(),
          startDay,
        ),
      );

      const end = this.createUtcDate(
        reference.getUTCFullYear(),
        reference.getUTCMonth(),
        this.clampDay(
          reference.getUTCFullYear(),
          reference.getUTCMonth(),
          endDay,
        ),
      );

      return {
        startDate: this.dateToDateString(start),
        endDate: this.dateToDateString(end),
      };
    }

    const startMonthOffset = referenceDay >= startDay ? 0 : -1;
    const endMonthOffset = referenceDay >= startDay ? 1 : 0;

    const startMonth = this.createUtcDate(
      reference.getUTCFullYear(),
      reference.getUTCMonth() + startMonthOffset,
      1,
    );

    const endMonth = this.createUtcDate(
      reference.getUTCFullYear(),
      reference.getUTCMonth() + endMonthOffset,
      1,
    );

    const start = this.createUtcDate(
      startMonth.getUTCFullYear(),
      startMonth.getUTCMonth(),
      this.clampDay(
        startMonth.getUTCFullYear(),
        startMonth.getUTCMonth(),
        startDay,
      ),
    );

    const end = this.createUtcDate(
      endMonth.getUTCFullYear(),
      endMonth.getUTCMonth(),
      this.clampDay(endMonth.getUTCFullYear(), endMonth.getUTCMonth(), endDay),
    );

    return {
      startDate: this.dateToDateString(start),
      endDate: this.dateToDateString(end),
    };
  }

  async getPayrollPeriodForDate(user: AuthUser, referenceDate: string) {
    if (!user.cinemaId) {
      throw new BadRequestException('Der mangler cinemaId på brugeren');
    }

    const reference = new Date(`${referenceDate}T00:00:00.000Z`);

    if (Number.isNaN(reference.getTime())) {
      throw new BadRequestException('Ugyldig dato');
    }

    const cinema = await this.prisma.cinema.findUnique({
      where: {
        id: user.cinemaId,
      },
    });

    if (!cinema) {
      throw new NotFoundException('Biograf blev ikke fundet');
    }

    return this.calculatePayrollPeriodForDate(cinema, reference);
  }

  private resolvePayrollData(timeEntry: any): PayrollData {
    const directPayrollType = timeEntry.payrollType;

    if (directPayrollType) {
      return {
        payrollCode: directPayrollType.payrollCode,
        exportCode:
          directPayrollType.exportCode || directPayrollType.payrollCode,
        payrollName: directPayrollType.name,
      };
    }

    const workTypePayrollType = timeEntry.shift?.workType?.payrollType;

    if (workTypePayrollType) {
      return {
        payrollCode: workTypePayrollType.payrollCode,
        exportCode:
          workTypePayrollType.exportCode || workTypePayrollType.payrollCode,
        payrollName: workTypePayrollType.name,
      };
    }

    const fallbackName = timeEntry.shift?.workType?.name || 'Standard';

    return {
      payrollCode: fallbackName.toUpperCase(),
      exportCode: fallbackName.toUpperCase(),
      payrollName: fallbackName,
    };
  }

  private async getPayrollRulesEnabled(user: AuthUser): Promise<boolean> {
    if (!user.cinemaId) return false;

    const cinema = await this.prisma.cinema.findUnique({
      where: {
        id: user.cinemaId,
      },
    });

    return Boolean((cinema as any)?.payrollRulesEnabled);
  }

  private getSimplePayrollSegment(entry: {
    hours: number;
    exportCode: string;
    payrollName: string;
  }): PayrollExportSegment[] {
    return [
      {
        hours: entry.hours,
        exportCode: entry.exportCode,
        payrollName: entry.payrollName,
      },
    ];
  }

  async getPayrollReport(
    user: AuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
  ) {
    this.ensurePayrollAccess(user);

    const { start, end } = this.getPeriodDates(startDate, endDate);

    const entries = await this.prisma.timeEntry.findMany({
      where: {
        ...this.getCinemaFilter(user),
        ...(userId ? { userId: Number(userId) } : {}),
        clockIn: {
          gte: start,
          lte: end,
        },
        clockOut: {
          not: null,
        },
        status: 'APPROVED',
      },
      include: {
        user: true,
        payrollPeriod: true,
        payrollType: true,
        shift: {
          include: {
            workType: {
              include: {
                payrollType: true,
              },
            },
          },
        },
      },
      orderBy: {
        clockIn: 'asc',
      },
    });

    const pendingCount = await this.prisma.timeEntry.count({
      where: {
        ...this.getCinemaFilter(user),
        ...(userId ? { userId: Number(userId) } : {}),
        clockIn: {
          gte: start,
          lte: end,
        },
        clockOut: {
          not: null,
        },
        status: 'PENDING',
      },
    });

    const voidedCount = await this.prisma.timeEntry.count({
      where: {
        ...this.getCinemaFilter(user),
        ...(userId ? { userId: Number(userId) } : {}),
        clockIn: {
          gte: start,
          lte: end,
        },
        clockOut: {
          not: null,
        },
        status: 'VOIDED',
      },
    });

    const grouped = new Map<
      number,
      {
        userId: number;
        name: string;
        email: string;
        employeeNumber: string | null;
        payrollEmployeeId: string | null;
        totalHours: number;
        deviationCount: number;
        entries: {
          id: number;
          date: string;
          clockIn: string;
          clockOut: string;
          hours: number;
          workType: string;
          payrollCode: string;
          exportCode: string;
          payrollName: string;
          status: string;
          note: string | null;
          adminNote: string | null;
          payrollLocked: boolean;
          payrollUnlockedByMaster: boolean;
          payrollPeriodId: number | null;
          deviation: TimeEntryDeviation;
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
          employeeNumber: entry.user.employeeNumber,
          payrollEmployeeId: entry.user.payrollEmployeeId,
          totalHours: 0,
          deviationCount: 0,
          entries: [],
        });
      }

      const userGroup = grouped.get(entry.userId);
      if (!userGroup) continue;

      const payrollData = this.resolvePayrollData(entry);
      const deviation = this.analyzeDeviation(entry);

      userGroup.totalHours += hours;

      if (deviation.hasDeviation) {
        userGroup.deviationCount += 1;
      }

      userGroup.entries.push({
        id: entry.id,
        date: entry.clockIn.toISOString().slice(0, 10),
        clockIn: entry.clockIn.toISOString(),
        clockOut: entry.clockOut.toISOString(),
        hours: Number(hours.toFixed(2)),
        workType: entry.shift?.workType?.name || '-',
        payrollCode: payrollData.payrollCode,
        exportCode: payrollData.exportCode,
        payrollName: payrollData.payrollName,
        status: entry.status,
        note: entry.note,
        adminNote: entry.adminNote,
        payrollLocked: entry.payrollLocked,
        payrollUnlockedByMaster: entry.payrollUnlockedByMaster,
        payrollPeriodId: entry.payrollPeriodId,
        deviation,
      });
    }

    return {
      employees: Array.from(grouped.values()).map((employee) => ({
        ...employee,
        totalHours: Number(employee.totalHours.toFixed(2)),
        deviationCount: employee.deviationCount,
      })),
      pendingCount,
      voidedCount,
    };
  }

  async getPeriod(user: AuthUser, startDate: string, endDate: string) {
    this.ensurePayrollAccess(user);

    const { start, end } = this.getPeriodDates(startDate, endDate);

    return this.prisma.payrollPeriod.findFirst({
      where: {
        ...this.getCinemaFilter(user),
        startDate: start,
        endDate: end,
      },
      include: {
        timeEntries: true,
      },
    });
  }

  async lockPeriod(user: AuthUser, startDate: string, endDate: string) {
    this.ensurePayrollAccess(user);

    if (
      user.role !== 'MASTER' &&
      user.role !== 'ADMIN' &&
      !user.canManagePayroll
    ) {
      throw new ForbiddenException(
        'Du har ikke adgang til at låse lønperioder',
      );
    }

    const { start, end } = this.getPeriodDates(startDate, endDate);

    if (!user.cinemaId) {
      throw new BadRequestException('Der mangler cinemaId på brugeren');
    }

    const cinemaId = user.cinemaId;

    const existingPeriod = await this.prisma.payrollPeriod.findFirst({
      where: {
        cinemaId,
        startDate: start,
        endDate: end,
      },
    });

    if (
      existingPeriod?.status === 'LOCKED' ||
      existingPeriod?.status === 'EXPORTED'
    ) {
      throw new BadRequestException('Lønperioden er allerede låst');
    }

    const entries = await this.prisma.timeEntry.findMany({
      where: {
        cinemaId,
        clockIn: {
          gte: start,
          lte: end,
        },
        clockOut: {
          not: null,
        },
      },
      include: {
        payrollType: true,
        shift: {
          include: {
            workType: {
              include: {
                payrollType: true,
              },
            },
          },
        },
      },
    });

    const period = existingPeriod
      ? await this.prisma.payrollPeriod.update({
          where: { id: existingPeriod.id },
          data: {
            status: 'LOCKED',
            lockedAt: new Date(),
            lockedByUserId: user.sub,
            exportedAt: null,
            exportedByUserId: null,
            unlockedAt: null,
            unlockedByUserId: null,
            unlockNote: null,
          },
        })
      : await this.prisma.payrollPeriod.create({
          data: {
            cinemaId,
            startDate: start,
            endDate: end,
            status: 'LOCKED',
            lockedAt: new Date(),
            lockedByUserId: user.sub,
          },
        });

    const defaultPayrollType = await this.prisma.payrollType.findFirst({
      where: {
        cinemaId,
        isDefault: true,
        isActive: true,
      },
    });

    for (const entry of entries) {
      const payrollType =
        entry.payrollType ||
        entry.shift?.workType?.payrollType ||
        defaultPayrollType;

      await this.prisma.timeEntry.update({
        where: { id: entry.id },
        data: {
          payrollPeriodId: period.id,
          payrollLocked: true,
          payrollUnlockedByMaster: false,
          payrollUnlockedAt: null,
          payrollLockNote: null,
          payrollTypeId: payrollType?.id || null,
        },
      });
    }

    return period;
  }

  async unlockPeriod(user: AuthUser, periodId: number, note?: string) {
    this.ensurePayrollAccess(user);
    this.ensureMaster(user);

    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new NotFoundException('Lønperioden blev ikke fundet');
    }

    const updatedPeriod = await this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: {
        status: 'UNLOCKED',
        unlockedAt: new Date(),
        unlockedByUserId: user.sub,
        unlockNote: note || null,
      },
    });

    await this.prisma.timeEntry.updateMany({
      where: {
        payrollPeriodId: periodId,
      },
      data: {
        payrollLocked: false,
        payrollUnlockedByMaster: true,
        payrollUnlockedAt: new Date(),
        payrollLockNote: note || null,
      },
    });

    return updatedPeriod;
  }

  async unlockTimeEntry(user: AuthUser, timeEntryId: number, note?: string) {
    this.ensurePayrollAccess(user);
    this.ensureMaster(user);

    const entry = await this.prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
    });

    if (!entry) {
      throw new NotFoundException('Tidsregistreringen blev ikke fundet');
    }

    return this.prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        payrollLocked: false,
        payrollUnlockedByMaster: true,
        payrollUnlockedAt: new Date(),
        payrollLockNote: note || null,
      },
    });
  }

  private async ensureEntriesApproved(
    user: AuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
  ) {
    const { start, end } = this.getPeriodDates(startDate, endDate);

    const unapprovedEntries = await this.prisma.timeEntry.findMany({
      where: {
        ...this.getCinemaFilter(user),
        ...(userId ? { userId: Number(userId) } : {}),
        clockIn: {
          gte: start,
          lte: end,
        },
        clockOut: {
          not: null,
        },
        status: 'PENDING',
      },
      include: {
        user: true,
      },
    });

    if (unapprovedEntries.length > 0) {
      const names = unapprovedEntries
        .map((entry) => `${entry.user.firstName} ${entry.user.lastName}`)
        .filter((name, index, arr) => arr.indexOf(name) === index)
        .join(', ');

      throw new BadRequestException(
        `Kan ikke eksportere. Der findes ${unapprovedEntries.length} afventende tidsregistreringer i perioden: ${names}`,
      );
    }
  }

  private async markPeriodAsExported(
    user: AuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
  ) {
    if (userId) return;
    if (!user.cinemaId) return;

    const { start, end } = this.getPeriodDates(startDate, endDate);

    const period = await this.prisma.payrollPeriod.findFirst({
      where: {
        cinemaId: user.cinemaId,
        startDate: start,
        endDate: end,
      },
    });

    if (!period) return;

    await this.prisma.payrollPeriod.update({
      where: { id: period.id },
      data: {
        status: 'EXPORTED',
        exportedAt: new Date(),
        exportedByUserId: user.sub,
      },
    });
  }

  async exportPayrollCsv(
    user: AuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
  ) {
    this.ensurePayrollExportAccess(user);

    await this.ensureEntriesApproved(user, startDate, endDate, userId);

    const report = await this.getPayrollReport(
      user,
      startDate,
      endDate,
      userId,
    );

    await this.markPeriodAsExported(user, startDate, endDate, userId);

    const rows = [
      [
        'Medarbejder',
        'Medarbejdernummer',
        'Løn medarbejder ID',
        'Email',
        'Dato',
        'Ind',
        'Ud',
        'Timer',
        'Arbejdstype',
        'Lønart',
        'Eksportkode',
        'Løntype',
        'Status',
        'Note',
        'Admin note',
        'Låst',
        'Låst op af MASTER',
      ],
    ];

    for (const employee of report.employees) {
      for (const entry of employee.entries) {
        rows.push([
          employee.name,
          employee.employeeNumber || '',
          employee.payrollEmployeeId || '',
          employee.email,
          entry.date,
          entry.clockIn,
          entry.clockOut,
          entry.hours.toString().replace('.', ','),
          entry.workType,
          entry.payrollCode,
          entry.exportCode,
          entry.payrollName,
          entry.status,
          entry.note || '',
          entry.adminNote || '',
          entry.payrollLocked ? 'Ja' : 'Nej',
          entry.payrollUnlockedByMaster ? 'Ja' : 'Nej',
        ]);
      }
    }

    return rows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'),
      )
      .join('\n');
  }

  async exportUnicontaCsv(
    user: AuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
  ) {
    this.ensurePayrollExportAccess(user);

    await this.ensureEntriesApproved(user, startDate, endDate, userId);

    const report = await this.getPayrollReport(
      user,
      startDate,
      endDate,
      userId,
    );

    await this.markPeriodAsExported(user, startDate, endDate, userId);

    const usePayrollRules = await this.getPayrollRulesEnabled(user);
    const rows = [['Employee', 'PayrollCode', 'Date', 'Hours', 'Text']];

    for (const employee of report.employees) {
      for (const entry of employee.entries) {
        const segments = usePayrollRules
          ? this.payrollRulesService.calculateSegments(entry)
          : this.getSimplePayrollSegment(entry);

        for (const segment of segments) {
          rows.push([
            employee.payrollEmployeeId ||
              employee.employeeNumber ||
              employee.email,
            segment.exportCode,
            entry.date,
            segment.hours.toFixed(2).replace('.', ','),
            `${entry.workType} - ${segment.payrollName}`,
          ]);
        }
      }
    }

    return rows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'),
      )
      .join('\n');
  }

  async exportPayrollXlsx(
    user: AuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
  ) {
    this.ensurePayrollExportAccess(user);

    await this.ensureEntriesApproved(user, startDate, endDate, userId);

    const report = await this.getPayrollReport(
      user,
      startDate,
      endDate,
      userId,
    );

    await this.markPeriodAsExported(user, startDate, endDate, userId);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Payroll');

    sheet.columns = [
      { header: 'Medarbejder', key: 'employee', width: 30 },
      { header: 'Medarbejdernummer', key: 'employeeNumber', width: 20 },
      { header: 'Løn medarbejder ID', key: 'payrollEmployeeId', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Dato', key: 'date', width: 15 },
      { header: 'Ind', key: 'clockIn', width: 25 },
      { header: 'Ud', key: 'clockOut', width: 25 },
      { header: 'Timer', key: 'hours', width: 12 },
      { header: 'Arbejdstype', key: 'workType', width: 20 },
      { header: 'Lønart', key: 'payrollCode', width: 16 },
      { header: 'Eksportkode', key: 'exportCode', width: 16 },
      { header: 'Løntype', key: 'payrollName', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Note', key: 'note', width: 30 },
      { header: 'Admin note', key: 'adminNote', width: 30 },
      { header: 'Låst', key: 'locked', width: 12 },
      { header: 'Låst op af MASTER', key: 'unlockedByMaster', width: 20 },
    ];

    for (const employee of report.employees) {
      for (const entry of employee.entries) {
        sheet.addRow({
          employee: employee.name,
          employeeNumber: employee.employeeNumber || '',
          payrollEmployeeId: employee.payrollEmployeeId || '',
          email: employee.email,
          date: entry.date,
          clockIn: entry.clockIn,
          clockOut: entry.clockOut,
          hours: entry.hours,
          workType: entry.workType,
          payrollCode: entry.payrollCode,
          exportCode: entry.exportCode,
          payrollName: entry.payrollName,
          status: entry.status,
          note: entry.note || '',
          adminNote: entry.adminNote || '',
          locked: entry.payrollLocked ? 'Ja' : 'Nej',
          unlockedByMaster: entry.payrollUnlockedByMaster ? 'Ja' : 'Nej',
        });
      }
    }

    sheet.getRow(1).font = {
      bold: true,
    };

    return workbook.xlsx.writeBuffer();
  }

  async exportPayrollPdf(
    user: AuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
  ): Promise<Buffer> {
    this.ensurePayrollExportAccess(user);

    await this.ensureEntriesApproved(user, startDate, endDate, userId);

    const report = await this.getPayrollReport(
      user,
      startDate,
      endDate,
      userId,
    );

    await this.markPeriodAsExported(user, startDate, endDate, userId);

    const chunks: Buffer[] = [];

    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
    });

    doc.on('data', (chunk) => chunks.push(chunk));

    doc.fontSize(20).text('Lønrapport', {
      align: 'center',
    });

    doc.moveDown();

    doc.fontSize(11).text(`Periode: ${startDate} til ${endDate}`);
    doc.text(`Eksporteret: ${new Date().toLocaleString('da-DK')}`);

    doc.moveDown();

    for (const employee of report.employees) {
      doc.fontSize(14).text(employee.name, {
        underline: true,
      });

      doc.fontSize(10).text(employee.email);

      if (employee.employeeNumber) {
        doc.text(`Medarbejdernummer: ${employee.employeeNumber}`);
      }

      if (employee.payrollEmployeeId) {
        doc.text(`Løn medarbejder ID: ${employee.payrollEmployeeId}`);
      }

      doc.text(`Timer i alt: ${employee.totalHours.toFixed(2)}`);

      doc.moveDown(0.5);

      for (const entry of employee.entries) {
        doc
          .fontSize(9)
          .text(
            `${entry.date} | ${entry.hours.toFixed(2)} timer | ${entry.workType} | ${entry.payrollName} | ${entry.exportCode} | ${entry.status}`,
          );

        if (entry.note || entry.adminNote) {
          doc.fontSize(8).text(`Note: ${entry.adminNote || entry.note}`);
        }
      }

      doc.moveDown();
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
  }

  async getPayrollAuditHistory(
    user: AuthUser,
    startDate: string,
    endDate: string,
  ) {
    this.ensurePayrollAccess(user);

    const { start, end } = this.getPeriodDates(startDate, endDate);

    const periods = await this.prisma.payrollPeriod.findMany({
      where: {
        ...this.getCinemaFilter(user),
        startDate: {
          gte: start,
        },
        endDate: {
          lte: end,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return periods.map((period) => ({
      id: period.id,
      status: period.status,
      startDate: period.startDate,
      endDate: period.endDate,
      lockedAt: period.lockedAt,
      lockedByUserId: period.lockedByUserId,
      exportedAt: period.exportedAt,
      exportedByUserId: period.exportedByUserId,
      unlockedAt: period.unlockedAt,
      unlockedByUserId: period.unlockedByUserId,
      unlockNote: period.unlockNote,
    }));
  }
}
