import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PayrollRulesService } from './payroll-rules.service';
import { type PayrollAuthUser } from './helpers/payroll-access';
import { buildPayrollReportData } from './helpers/payroll-report-data';
import {
  findCurrentPayrollPeriodEntity,
  findPayrollPeriodEntityForDate,
  resolvePayrollPeriodForDate,
} from './helpers/payroll-period-queries';
import { lockPayrollPeriod } from './helpers/payroll-period-lock-flow';
import {
  unlockPayrollPeriod,
  unlockPayrollTimeEntry,
} from './helpers/payroll-period-unlock-flow';
import { getPayrollPeriodWithTimeEntries } from './helpers/payroll-period-read-flow';
import {
  exportPayrollCsvFlow,
  exportPayrollPdfFlow,
  exportPayrollUnicontaCsvFlow,
  exportPayrollXlsxFlow,
} from './helpers/payroll-export-flow';
import { getPayrollAuditHistoryData } from './helpers/payroll-audit-history';

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
    return getPayrollPeriodWithTimeEntries(
      this.prisma,
      user,
      startDate,
      endDate,
      selectedCinemaId,
    );
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
    return exportPayrollCsvFlow(
      this.prisma,
      user,
      startDate,
      endDate,
      userId,
      selectedCinemaId,
    );
  }

  async exportUnicontaCsv(
    user: PayrollAuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
    selectedCinemaId?: number | null,
  ) {
    return exportPayrollUnicontaCsvFlow(
      this.prisma,
      this.payrollRulesService,
      user,
      startDate,
      endDate,
      userId,
      selectedCinemaId,
    );
  }

  async exportPayrollXlsx(
    user: PayrollAuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
    selectedCinemaId?: number | null,
  ) {
    return exportPayrollXlsxFlow(
      this.prisma,
      user,
      startDate,
      endDate,
      userId,
      selectedCinemaId,
    );
  }

  async exportPayrollPdf(
    user: PayrollAuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
    selectedCinemaId?: number | null,
  ): Promise<Buffer> {
    return exportPayrollPdfFlow(
      this.prisma,
      user,
      startDate,
      endDate,
      userId,
      selectedCinemaId,
    );
  }

  async getPayrollAuditHistory(
    user: PayrollAuthUser,
    startDate: string,
    endDate: string,
    selectedCinemaId?: number | null,
  ) {
    return getPayrollAuditHistoryData(
      this.prisma,
      user,
      startDate,
      endDate,
      selectedCinemaId,
    );
  }
}
