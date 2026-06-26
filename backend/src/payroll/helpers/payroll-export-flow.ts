import { PrismaService } from '../../prisma/prisma.service';
import { type PayrollRulesService } from '../payroll-rules.service';
import {
  ensurePayrollExportAccess,
  type PayrollAuthUser,
} from './payroll-access';
import {
  ensurePayrollEntriesApproved,
  markPayrollPeriodAsExported,
} from './payroll-period-export';
import { buildPayrollCsvExport } from './payroll-csv-export';
import { buildPayrollPdfExport } from './payroll-pdf-export';
import { buildPayrollReportData } from './payroll-report-data';
import { buildPayrollUnicontaCsvExport } from './payroll-uniconta-export';
import { buildPayrollXlsxExport } from './payroll-xlsx-export';
import { getPayrollRulesEnabled } from './payroll-period-queries';

async function buildExportReport(
  prisma: PrismaService,
  user: PayrollAuthUser,
  startDate: string,
  endDate: string,
  userId?: string,
  selectedCinemaId?: number | null,
) {
  ensurePayrollExportAccess(user);

  await ensurePayrollEntriesApproved(
    prisma,
    user,
    startDate,
    endDate,
    userId,
    selectedCinemaId,
  );

  await markPayrollPeriodAsExported(
    prisma,
    user,
    startDate,
    endDate,
    userId,
    selectedCinemaId,
  );

  return buildPayrollReportData(
    prisma,
    user,
    startDate,
    endDate,
    userId,
    selectedCinemaId,
  );
}

export async function exportPayrollCsvFlow(
  prisma: PrismaService,
  user: PayrollAuthUser,
  startDate: string,
  endDate: string,
  userId?: string,
  selectedCinemaId?: number | null,
) {
  const report = await buildExportReport(
    prisma,
    user,
    startDate,
    endDate,
    userId,
    selectedCinemaId,
  );

  return buildPayrollCsvExport(report);
}

export async function exportPayrollUnicontaCsvFlow(
  prisma: PrismaService,
  payrollRulesService: PayrollRulesService,
  user: PayrollAuthUser,
  startDate: string,
  endDate: string,
  userId?: string,
  selectedCinemaId?: number | null,
) {
  const report = await buildExportReport(
    prisma,
    user,
    startDate,
    endDate,
    userId,
    selectedCinemaId,
  );

  const usePayrollRules = await getPayrollRulesEnabled(
    prisma,
    user,
    selectedCinemaId,
  );

  return buildPayrollUnicontaCsvExport(report, usePayrollRules, (entry) =>
    payrollRulesService.calculateSegments(entry),
  );
}

export async function exportPayrollXlsxFlow(
  prisma: PrismaService,
  user: PayrollAuthUser,
  startDate: string,
  endDate: string,
  userId?: string,
  selectedCinemaId?: number | null,
) {
  const report = await buildExportReport(
    prisma,
    user,
    startDate,
    endDate,
    userId,
    selectedCinemaId,
  );

  return buildPayrollXlsxExport(report);
}

export async function exportPayrollPdfFlow(
  prisma: PrismaService,
  user: PayrollAuthUser,
  startDate: string,
  endDate: string,
  userId?: string,
  selectedCinemaId?: number | null,
): Promise<Buffer> {
  const report = await buildExportReport(
    prisma,
    user,
    startDate,
    endDate,
    userId,
    selectedCinemaId,
  );

  return buildPayrollPdfExport(report, startDate, endDate);
}
