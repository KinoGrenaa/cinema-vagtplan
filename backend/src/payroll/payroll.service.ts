import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PayrollRulesService } from './payroll-rules.service';
import { getPeriodDates } from './helpers/payroll-periods';
import {
  ensurePayrollAccess,
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
import { buildPayrollReportData } from './helpers/payroll-report-data';
import { buildPayrollUnicontaCsvExport } from './helpers/payroll-uniconta-export';
import { buildPayrollXlsxExport } from './helpers/payroll-xlsx-export';
import {
  findCurrentPayrollPeriodEntity,
  findPayrollPeriodEntityForDate,
  getPayrollRulesEnabled,
  resolvePayrollPeriodForDate,
} from './helpers/payroll-period-queries';
import { lockPayrollPeriod } from './helpers/payroll-period-lock-flow';
import {
  unlockPayrollPeriod,
  unlockPayrollTimeEntry,
} from './helpers/payroll-period-unlock-flow';

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
    return resolvePayrollPeriodForDate(
      this.prisma,
      user,
      referenceDate,
      selectedCinemaId,
    );
  }

  async getPayrollPeriodEntityForDate(cinemaId: number, referenceDate: Date) {
    return findPayrollPeriodEntityForDate(
      this.prisma,
      cinemaId,
      referenceDate,
    );
  }

  async getCurrentPayrollPeriodEntity(cinemaId: number) {
    return findCurrentPayrollPeriodEntity(this.prisma, cinemaId);
  }

  async getPayrollReport(
    user: PayrollAuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
    selectedCinemaId?: number | null,
  ) {
    return buildPayrollReportData(
      this.prisma,
      user,
      startDate,
      endDate,
      userId,
      selectedCinemaId,
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
    return lockPayrollPeriod(
      this.prisma,
      user,
      startDate,
      endDate,
      selectedCinemaId,
    );
  }

  async unlockPeriod(
    user: PayrollAuthUser,
    periodId: number,
    note?: string,
    selectedCinemaId?: number | null,
  ) {
    return unlockPayrollPeriod(
      this.prisma,
      user,
      periodId,
      note,
      selectedCinemaId,
    );
  }

  async unlockTimeEntry(
    user: PayrollAuthUser,
    timeEntryId: number,
    note?: string,
    selectedCinemaId?: number | null,
  ) {
    return unlockPayrollTimeEntry(
      this.prisma,
      user,
      timeEntryId,
      note,
      selectedCinemaId,
    );
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

    const usePayrollRules = await getPayrollRulesEnabled(
      this.prisma,
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
