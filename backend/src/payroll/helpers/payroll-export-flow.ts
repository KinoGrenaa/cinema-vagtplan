import { PrismaService } from '../../prisma/prisma.service';
import {
  ensurePayrollExportAccess,
  type PayrollAuthUser,
} from './payroll-access';
import {
  getPayrollExportLockSnapshot,
  type PayrollExportLockSnapshot,
} from './payroll-export-readiness';
import {
  ensurePayrollEntriesApproved,
  markPayrollPeriodAsExported,
} from './payroll-period-export';
import { buildPayrollCsvExport } from './payroll-csv-export';
import { buildPayrollPdfExport } from './payroll-pdf-export';
import { buildPayrollReportData } from './payroll-report-data';
import { buildPayrollUnicontaCsvExport } from './payroll-uniconta-export';
import { buildPayrollXlsxExport } from './payroll-xlsx-export';

type PayrollExportParams = {
  prisma: PrismaService;
  user: PayrollAuthUser;
  startDate: string;
  endDate: string;
  userId?: string;
  selectedCinemaId?: number | null;
};

type PreparedPayrollExport = {
  report: Awaited<ReturnType<typeof buildPayrollReportData>>;
  lockSnapshot: PayrollExportLockSnapshot | null;
};

async function preparePayrollExportReport({
  prisma,
  user,
  startDate,
  endDate,
  userId,
  selectedCinemaId,
}: PayrollExportParams): Promise<PreparedPayrollExport> {
  ensurePayrollExportAccess(user);

  const lockSnapshot = await getPayrollExportLockSnapshot(
    prisma,
    user,
    startDate,
    endDate,
    userId,
    selectedCinemaId,
  );

  await ensurePayrollEntriesApproved(
    prisma,
    user,
    startDate,
    endDate,
    userId,
    selectedCinemaId,
  );

  const report = await buildPayrollReportData(
    prisma,
    user,
    startDate,
    endDate,
    userId,
    selectedCinemaId,
  );

  return {
    report,
    lockSnapshot,
  };
}

async function finalizePayrollExport({
  prisma,
  user,
  startDate,
  endDate,
  userId,
  selectedCinemaId,
  lockSnapshot,
}: PayrollExportParams & {
  lockSnapshot: PayrollExportLockSnapshot | null;
}) {
  await markPayrollPeriodAsExported(
    prisma,
    user,
    startDate,
    endDate,
    userId,
    selectedCinemaId,
    lockSnapshot,
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
  const params = {
    prisma,
    user,
    startDate,
    endDate,
    userId,
    selectedCinemaId,
  };
  const prepared = await preparePayrollExportReport(params);
  const csv = buildPayrollCsvExport(prepared.report);

  await finalizePayrollExport({
    ...params,
    lockSnapshot: prepared.lockSnapshot,
  });

  return csv;
}

export async function exportPayrollUnicontaCsvFlow(
  prisma: PrismaService,
  user: PayrollAuthUser,
  startDate: string,
  endDate: string,
  userId?: string,
  selectedCinemaId?: number | null,
) {
  const params = {
    prisma,
    user,
    startDate,
    endDate,
    userId,
    selectedCinemaId,
  };
  const prepared = await preparePayrollExportReport(params);
  const csv = buildPayrollUnicontaCsvExport(prepared.report);

  await finalizePayrollExport({
    ...params,
    lockSnapshot: prepared.lockSnapshot,
  });

  return csv;
}

export async function exportPayrollXlsxFlow(
  prisma: PrismaService,
  user: PayrollAuthUser,
  startDate: string,
  endDate: string,
  userId?: string,
  selectedCinemaId?: number | null,
) {
  const params = {
    prisma,
    user,
    startDate,
    endDate,
    userId,
    selectedCinemaId,
  };
  const prepared = await preparePayrollExportReport(params);
  const buffer = await buildPayrollXlsxExport(prepared.report);

  await finalizePayrollExport({
    ...params,
    lockSnapshot: prepared.lockSnapshot,
  });

  return buffer;
}

export async function exportPayrollPdfFlow(
  prisma: PrismaService,
  user: PayrollAuthUser,
  startDate: string,
  endDate: string,
  userId?: string,
  selectedCinemaId?: number | null,
): Promise<Buffer> {
  const params = {
    prisma,
    user,
    startDate,
    endDate,
    userId,
    selectedCinemaId,
  };
  const prepared = await preparePayrollExportReport(params);
  const buffer = await buildPayrollPdfExport(
    prepared.report,
    startDate,
    endDate,
  );

  await finalizePayrollExport({
    ...params,
    lockSnapshot: prepared.lockSnapshot,
  });

  return buffer;
}
