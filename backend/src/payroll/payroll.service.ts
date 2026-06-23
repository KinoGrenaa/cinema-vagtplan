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
import {
  analyzePayrollTimeEntryDeviation,
  type TimeEntryDeviation,
} from './helpers/payroll-deviation';
import {
  calculatePayrollPeriodForDate,
  dateToCopenhagenDateString,
  getPayrollReferenceDate,
  getPayrollReferenceDateFilters,
  getPeriodDates,
} from './helpers/payroll-periods';
import {
  ensurePayrollAccess,
  ensurePayrollAdminOrMaster,
  ensurePayrollExportAccess,
  getPayrollCinemaFilter,
  type PayrollAuthUser,
} from './helpers/payroll-access';
import {
  formatPayrollCsvRows,
  getSimplePayrollSegment,
  resolvePayrollData,
} from './helpers/payroll-export';

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private payrollRulesService: PayrollRulesService,
  ) {}

  async getPayrollPeriodForDate(
    user: PayrollAuthUser,
    referenceDate: string,
    selectedCinemaId?: number | null,
  ) {
    const cinemaId = getPayrollCinemaFilter(user, selectedCinemaId).cinemaId;

    const reference = new Date(`${referenceDate}T00:00:00.000Z`);

    if (Number.isNaN(reference.getTime())) {
      throw new BadRequestException('Ugyldig dato');
    }

    const cinema = await this.prisma.cinema.findUnique({
      where: {
        id: cinemaId,
      },
    });

    if (!cinema) {
      throw new NotFoundException('Biograf blev ikke fundet');
    }

    return calculatePayrollPeriodForDate(cinema, reference);
  }

  async getPayrollPeriodEntityForDate(cinemaId: number, referenceDate: Date) {
    const cinema = await this.prisma.cinema.findUnique({
      where: { id: cinemaId },
    });

    if (!cinema) {
      throw new NotFoundException('Biograf blev ikke fundet');
    }

    const { startDate, endDate } = calculatePayrollPeriodForDate(
      cinema,
      referenceDate,
    );

    return this.prisma.payrollPeriod.findUnique({
      where: {
        cinemaId_startDate_endDate: {
          cinemaId,
          startDate: new Date(`${startDate}T00:00:00`),
          endDate: new Date(`${endDate}T23:59:59`),
        },
      },
    });
  }

  async getCurrentPayrollPeriodEntity(cinemaId: number) {
    return this.getPayrollPeriodEntityForDate(cinemaId, new Date());
  }

  private async getPayrollRulesEnabled(
    user: PayrollAuthUser,
    selectedCinemaId?: number | null,
  ): Promise<boolean> {
    const cinemaId = getPayrollCinemaFilter(user, selectedCinemaId).cinemaId;

    const cinema = await this.prisma.cinema.findUnique({
      where: {
        id: cinemaId,
      },
    });

    return Boolean((cinema as any)?.payrollRulesEnabled);
  }

  async getPayrollReport(
    user: PayrollAuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
    selectedCinemaId?: number | null,
  ) {
    ensurePayrollAccess(user);

    const { start, end } = getPeriodDates(startDate, endDate);

    const cinemaFilter = getPayrollCinemaFilter(user, selectedCinemaId);

    const entries = await this.prisma.timeEntry.findMany({
      where: {
        ...cinemaFilter,
        ...(userId ? { userId: Number(userId) } : {}),
        clockOut: {
          not: null,
        },
        status: 'APPROVED',
        OR: [
          ...getPayrollReferenceDateFilters(start, end),
          {
            isPayrollAdjustment: true,
            adjustmentPayrollPeriod: {
              startDate: start,
              endDate: end,
            },
          },
        ],
      },
      include: {
        user: true,
        payrollPeriod: true,
        originalPayrollPeriod: true,
        adjustmentPayrollPeriod: true,
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

    const payrollAdjustments = await this.prisma.payrollAdjustment.findMany({
      where: {
        ...cinemaFilter,
        ...(userId ? { userId: Number(userId) } : {}),
        status: 'PENDING',
        settlementPayrollPeriodId: null,
        originalPayrollPeriod: {
          endDate: {
            lt: start,
          },
        },
      },
      include: {
        user: true,
        payrollType: true,
        originalPayrollPeriod: true,
        settlementPayrollPeriod: true,
        timeEntry: {
          include: {
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
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const pendingCount = await this.prisma.timeEntry.count({
      where: {
        ...cinemaFilter,
        ...(userId ? { userId: Number(userId) } : {}),
        OR: getPayrollReferenceDateFilters(start, end),
        clockOut: {
          not: null,
        },
        status: 'PENDING',
      },
    });

    const voidedCount = await this.prisma.timeEntry.count({
      where: {
        ...cinemaFilter,
        ...(userId ? { userId: Number(userId) } : {}),
        OR: getPayrollReferenceDateFilters(start, end),
        clockOut: {
          not: null,
        },
        status: 'VOIDED',
      },
    });

    const legacyAdjustmentCount = entries.filter(
      (entry) => entry.isPayrollAdjustment,
    ).length;

    const grouped = new Map<
      number,
      {
        userId: number;
        name: string;
        email: string;
        employeeNumber: string | null;
        payrollEmployeeId: string | null;
        totalHours: number;
        adjustmentHours: number;
        deviationCount: number;
        adjustmentCount: number;
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
          isPayrollAdjustment: boolean;
          originalPayrollPeriodId: number | null;
          adjustmentPayrollPeriodId: number | null;
          payrollAdjustmentReason: string | null;
        }[];
        payrollAdjustments: {
          id: number;
          timeEntryId: number;
          type: string;
          status: string;
          exportCategory: string;
          hours: number;
          exportedHours: number;
          adjustedHours: number;
          previousHours: number | null;
          newHours: number | null;
          reason: string;
          originalPayrollPeriodId: number;
          originalPayrollPeriodStartDate: string;
          originalPayrollPeriodEndDate: string;
          settlementPayrollPeriodId: number | null;
          payrollCode: string;
          exportCode: string;
          payrollName: string;
          workType: string;
          createdAt: string;
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
          adjustmentHours: 0,
          deviationCount: 0,
          adjustmentCount: 0,
          entries: [],
          payrollAdjustments: [],
        });
      }

      const userGroup = grouped.get(entry.userId);
      if (!userGroup) continue;

      const payrollData = resolvePayrollData(entry);
      const deviation = analyzePayrollTimeEntryDeviation(entry);

      userGroup.totalHours += hours;

      if (deviation.hasDeviation) {
        userGroup.deviationCount += 1;
      }

      if (entry.isPayrollAdjustment) {
        userGroup.adjustmentCount += 1;
        userGroup.adjustmentHours += hours;
      }

      userGroup.entries.push({
        id: entry.id,
        date: dateToCopenhagenDateString(getPayrollReferenceDate(entry)),
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
        isPayrollAdjustment: entry.isPayrollAdjustment,
        originalPayrollPeriodId: entry.originalPayrollPeriodId,
        adjustmentPayrollPeriodId: entry.adjustmentPayrollPeriodId,
        payrollAdjustmentReason: entry.payrollAdjustmentReason,
      });
    }

    for (const adjustment of payrollAdjustments) {
      if (!grouped.has(adjustment.userId)) {
        grouped.set(adjustment.userId, {
          userId: adjustment.userId,
          name: `${adjustment.user.firstName} ${adjustment.user.lastName}`,
          email: adjustment.user.email,
          employeeNumber: adjustment.user.employeeNumber,
          payrollEmployeeId: adjustment.user.payrollEmployeeId,
          totalHours: 0,
          adjustmentHours: 0,
          deviationCount: 0,
          adjustmentCount: 0,
          entries: [],
          payrollAdjustments: [],
        });
      }

      const userGroup = grouped.get(adjustment.userId);
      if (!userGroup) continue;

      const payrollData =
        adjustment.payrollType ||
        adjustment.timeEntry.shift?.workType?.payrollType ||
        null;

      const adjustmentHours = adjustment.minutesDelta / 60;

      userGroup.adjustmentCount += 1;
      userGroup.adjustmentHours += adjustmentHours;

      userGroup.payrollAdjustments.push({
        id: adjustment.id,
        timeEntryId: adjustment.timeEntryId,
        type: adjustment.type,
        status: adjustment.status,
        exportCategory: adjustment.exportCategory,
        hours: Number(adjustmentHours.toFixed(2)),
        exportedHours: Number((adjustment.exportedMinutes / 60).toFixed(2)),
        adjustedHours: Number((adjustment.adjustedMinutes / 60).toFixed(2)),
        previousHours:
          adjustment.previousMinutes === null
            ? null
            : Number((adjustment.previousMinutes / 60).toFixed(2)),
        newHours:
          adjustment.newMinutes === null
            ? null
            : Number((adjustment.newMinutes / 60).toFixed(2)),
        reason: adjustment.reason,
        originalPayrollPeriodId: adjustment.originalPayrollPeriodId,
        originalPayrollPeriodStartDate:
          adjustment.originalPayrollPeriod.startDate.toISOString().slice(0, 10),
        originalPayrollPeriodEndDate: adjustment.originalPayrollPeriod.endDate
          .toISOString()
          .slice(0, 10),
        settlementPayrollPeriodId: adjustment.settlementPayrollPeriodId,
        payrollCode: payrollData?.payrollCode || 'NORMAL',
        exportCode:
          payrollData?.exportCode || payrollData?.payrollCode || 'NORMAL',
        payrollName: payrollData?.name || 'Normale timer',
        workType: adjustment.timeEntry.shift?.workType?.name || '-',
        createdAt: adjustment.createdAt.toISOString(),
      });
    }

    return {
      employees: Array.from(grouped.values()).map((employee) => ({
        ...employee,
        totalHours: Number(employee.totalHours.toFixed(2)),
        adjustmentHours: Number(employee.adjustmentHours.toFixed(2)),
        deviationCount: employee.deviationCount,
        adjustmentCount: employee.adjustmentCount,
      })),
      pendingCount,
      voidedCount,
      adjustmentCount: legacyAdjustmentCount + payrollAdjustments.length,
      payrollAdjustmentCount: payrollAdjustments.length,
    };
  }

  async getPeriod(
    user: PayrollAuthUser,
    startDate: string,
    endDate: string,
    selectedCinemaId?: number | null,
  ) {
    ensurePayrollAccess(user);

    const { start, end } = getPeriodDates(startDate, endDate);

    return this.prisma.payrollPeriod.findFirst({
      where: {
        ...getPayrollCinemaFilter(user, selectedCinemaId),
        startDate: start,
        endDate: end,
      },
      include: {
        timeEntries: true,
      },
    });
  }

  async lockPeriod(
    user: PayrollAuthUser,
    startDate: string,
    endDate: string,
    selectedCinemaId?: number | null,
  ) {
    ensurePayrollAccess(user);

    if (
      user.role !== 'MASTER' &&
      user.role !== 'ADMIN' &&
      !user.canManagePayroll
    ) {
      throw new ForbiddenException(
        'Du har ikke adgang til at låse lønperioder',
      );
    }

    const { start, end } = getPeriodDates(startDate, endDate);

    const cinemaId = getPayrollCinemaFilter(user, selectedCinemaId).cinemaId;

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
        OR: getPayrollReferenceDateFilters(start, end),
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

  async unlockPeriod(
    user: PayrollAuthUser,
    periodId: number,
    note?: string,
    selectedCinemaId?: number | null,
  ) {
    ensurePayrollAccess(user);
    ensurePayrollAdminOrMaster(user);

    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new NotFoundException('Lønperioden blev ikke fundet');
    }

    const cinemaId = getPayrollCinemaFilter(user, selectedCinemaId).cinemaId;

    if (period.cinemaId !== cinemaId) {
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
        cinemaId,
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

  async unlockTimeEntry(
    user: PayrollAuthUser,
    timeEntryId: number,
    note?: string,
    selectedCinemaId?: number | null,
  ) {
    ensurePayrollAccess(user);
    ensurePayrollAdminOrMaster(user);

    const entry = await this.prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
    });

    if (!entry) {
      throw new NotFoundException('Tidsregistreringen blev ikke fundet');
    }

    const cinemaId = getPayrollCinemaFilter(user, selectedCinemaId).cinemaId;

    if (entry.cinemaId !== cinemaId) {
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
    user: PayrollAuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
    selectedCinemaId?: number | null,
  ) {
    const { start, end } = getPeriodDates(startDate, endDate);

    const unapprovedEntries = await this.prisma.timeEntry.findMany({
      where: {
        ...getPayrollCinemaFilter(user, selectedCinemaId),
        ...(userId ? { userId: Number(userId) } : {}),
        OR: getPayrollReferenceDateFilters(start, end),
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
    user: PayrollAuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
    selectedCinemaId?: number | null,
  ) {
    if (userId) return;

    const { start, end } = getPeriodDates(startDate, endDate);
    const cinemaId = getPayrollCinemaFilter(user, selectedCinemaId).cinemaId;
    const now = new Date();

    const existingPeriod = await this.prisma.payrollPeriod.findFirst({
      where: {
        cinemaId,
        startDate: start,
        endDate: end,
      },
    });

    const period = existingPeriod
      ? await this.prisma.payrollPeriod.update({
          where: { id: existingPeriod.id },
          data: {
            status: 'EXPORTED',
            lockedAt: existingPeriod.lockedAt || now,
            lockedByUserId: existingPeriod.lockedByUserId || user.sub,
            exportedAt: now,
            exportedByUserId: user.sub,
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
            status: 'EXPORTED',
            lockedAt: now,
            lockedByUserId: user.sub,
            exportedAt: now,
            exportedByUserId: user.sub,
          },
        });

    const defaultPayrollType = await this.prisma.payrollType.findFirst({
      where: {
        cinemaId,
        isDefault: true,
        isActive: true,
      },
    });

    const entries = await this.prisma.timeEntry.findMany({
      where: {
        cinemaId,
        OR: getPayrollReferenceDateFilters(start, end),
        clockOut: {
          not: null,
        },
        status: 'APPROVED',
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
  }

  async exportPayrollCsv(
    user: PayrollAuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
    selectedCinemaId?: number | null,
  ) {
    ensurePayrollExportAccess(user);

    await this.ensureEntriesApproved(
      user,
      startDate,
      endDate,
      userId,
      selectedCinemaId,
    );

    await this.markPeriodAsExported(
      user,
      startDate,
      endDate,
      userId,
      selectedCinemaId,
    );

    const report = await this.getPayrollReport(
      user,
      startDate,
      endDate,
      userId,
      selectedCinemaId,
    );

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

    return formatPayrollCsvRows(rows);
  }

  async exportUnicontaCsv(
    user: PayrollAuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
    selectedCinemaId?: number | null,
  ) {
    ensurePayrollExportAccess(user);

    await this.ensureEntriesApproved(
      user,
      startDate,
      endDate,
      userId,
      selectedCinemaId,
    );

    await this.markPeriodAsExported(
      user,
      startDate,
      endDate,
      userId,
      selectedCinemaId,
    );

    const report = await this.getPayrollReport(
      user,
      startDate,
      endDate,
      userId,
      selectedCinemaId,
    );

    const usePayrollRules = await this.getPayrollRulesEnabled(
      user,
      selectedCinemaId,
    );
    const rows = [['Employee', 'PayrollCode', 'Date', 'Hours', 'Text']];

    for (const employee of report.employees) {
      for (const entry of employee.entries) {
        const segments = usePayrollRules
          ? this.payrollRulesService.calculateSegments(entry)
          : getSimplePayrollSegment(entry);

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

    return formatPayrollCsvRows(rows);
  }

  async exportPayrollXlsx(
    user: PayrollAuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
    selectedCinemaId?: number | null,
  ) {
    ensurePayrollExportAccess(user);

    await this.ensureEntriesApproved(
      user,
      startDate,
      endDate,
      userId,
      selectedCinemaId,
    );

    await this.markPeriodAsExported(
      user,
      startDate,
      endDate,
      userId,
      selectedCinemaId,
    );

    const report = await this.getPayrollReport(
      user,
      startDate,
      endDate,
      userId,
      selectedCinemaId,
    );

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
    user: PayrollAuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
    selectedCinemaId?: number | null,
  ): Promise<Buffer> {
    ensurePayrollExportAccess(user);

    await this.ensureEntriesApproved(
      user,
      startDate,
      endDate,
      userId,
      selectedCinemaId,
    );

    await this.markPeriodAsExported(
      user,
      startDate,
      endDate,
      userId,
      selectedCinemaId,
    );

    const report = await this.getPayrollReport(
      user,
      startDate,
      endDate,
      userId,
      selectedCinemaId,
    );

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
    user: PayrollAuthUser,
    startDate: string,
    endDate: string,
    selectedCinemaId?: number | null,
  ) {
    ensurePayrollAccess(user);

    const { start, end } = getPeriodDates(startDate, endDate);

    const periods = await this.prisma.payrollPeriod.findMany({
      where: {
        ...getPayrollCinemaFilter(user, selectedCinemaId),
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
