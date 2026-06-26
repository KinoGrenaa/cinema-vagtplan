import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PayrollRulesService } from './payroll-rules.service';
import {
  calculatePayrollPeriodForDate,
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
  ensurePayrollEntriesApproved,
  markPayrollPeriodAsExported,
} from './helpers/payroll-period-export';
import { buildPayrollCsvExport } from './helpers/payroll-csv-export';
import { buildPayrollPdfExport } from './helpers/payroll-pdf-export';
import { buildPayrollReportResult } from './helpers/payroll-report';
import { buildPayrollUnicontaCsvExport } from './helpers/payroll-uniconta-export';
import { buildPayrollXlsxExport } from './helpers/payroll-xlsx-export';

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

    return buildPayrollReportResult(
      entries,
      payrollAdjustments,
      pendingCount,
      voidedCount,
    );
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

  async exportPayrollCsv(
    user: PayrollAuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
    selectedCinemaId?: number | null,
  ) {
    ensurePayrollExportAccess(user);

    await ensurePayrollEntriesApproved(
      this.prisma,
      user,
      startDate,
      endDate,
      userId,
      selectedCinemaId,
    );

    await markPayrollPeriodAsExported(
      this.prisma,
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

    return buildPayrollCsvExport(report);
  }

  async exportUnicontaCsv(
    user: PayrollAuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
    selectedCinemaId?: number | null,
  ) {
    ensurePayrollExportAccess(user);

    await ensurePayrollEntriesApproved(
      this.prisma,
      user,
      startDate,
      endDate,
      userId,
      selectedCinemaId,
    );

    await markPayrollPeriodAsExported(
      this.prisma,
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
    return buildPayrollUnicontaCsvExport(report, usePayrollRules, (entry) =>
      this.payrollRulesService.calculateSegments(entry),
    );
  }

  async exportPayrollXlsx(
    user: PayrollAuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
    selectedCinemaId?: number | null,
  ) {
    ensurePayrollExportAccess(user);

    await ensurePayrollEntriesApproved(
      this.prisma,
      user,
      startDate,
      endDate,
      userId,
      selectedCinemaId,
    );

    await markPayrollPeriodAsExported(
      this.prisma,
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

    return buildPayrollXlsxExport(report);
  }

  async exportPayrollPdf(
    user: PayrollAuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
    selectedCinemaId?: number | null,
  ): Promise<Buffer> {
    ensurePayrollExportAccess(user);

    await ensurePayrollEntriesApproved(
      this.prisma,
      user,
      startDate,
      endDate,
      userId,
      selectedCinemaId,
    );

    await markPayrollPeriodAsExported(
      this.prisma,
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

    return buildPayrollPdfExport(report, startDate, endDate);
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
