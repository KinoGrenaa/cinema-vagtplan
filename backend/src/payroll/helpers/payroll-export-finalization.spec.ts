import {
  exportPayrollCsvFlow,
  exportPayrollPdfFlow,
  exportPayrollUnicontaCsvFlow,
  exportPayrollXlsxFlow,
} from './payroll-export-flow';
import { getPayrollExportLockSnapshot } from './payroll-export-readiness';
import {
  ensurePayrollEntriesApproved,
  markPayrollPeriodAsExported,
} from './payroll-period-export';
import { buildPayrollCsvExport } from './payroll-csv-export';
import { buildPayrollPdfExport } from './payroll-pdf-export';
import { buildPayrollReportData } from './payroll-report-data';
import { buildPayrollUnicontaCsvExport } from './payroll-uniconta-export';
import { buildPayrollXlsxExport } from './payroll-xlsx-export';

jest.mock('./payroll-access', () => ({
  ensurePayrollExportAccess: jest.fn(),
}));

jest.mock('./payroll-export-readiness', () => ({
  getPayrollExportLockSnapshot: jest.fn(),
}));

jest.mock('./payroll-period-export', () => ({
  ensurePayrollEntriesApproved: jest.fn(),
  markPayrollPeriodAsExported: jest.fn(),
}));

jest.mock('./payroll-report-data', () => ({
  buildPayrollReportData: jest.fn(),
}));

jest.mock('./payroll-csv-export', () => ({
  buildPayrollCsvExport: jest.fn(),
}));

jest.mock('./payroll-uniconta-export', () => ({
  buildPayrollUnicontaCsvExport: jest.fn(),
}));

jest.mock('./payroll-xlsx-export', () => ({
  buildPayrollXlsxExport: jest.fn(),
}));

jest.mock('./payroll-pdf-export', () => ({
  buildPayrollPdfExport: jest.fn(),
}));


describe('payroll export finalization', () => {
  const prisma = {} as any;
  const user = {
    sub: 7,
    email: 'payroll@example.com',
    role: 'ADMIN',
    cinemaId: 2,
    canManagePayroll: true,
  } as const;
  const report = {
    employees: [],
  };
  const lockSnapshot = {
    periodId: 12,
    cinemaId: 2,
    startDateTime: new Date(
      '2026-07-21T00:00:00.000Z',
    ).getTime(),
    endDateTime: new Date(
      '2026-08-20T23:59:59.999Z',
    ).getTime(),
    lockedAtTime: new Date(
      '2026-08-21T08:00:00.000Z',
    ).getTime(),
    lockedCalculationRunId: 44,
    calculationChecksum: 'checksum-44',
  };
  const params = [
    prisma,
    user,
    '2026-07-21',
    '2026-08-20',
    undefined,
    undefined,
  ] as const;

  beforeEach(() => {
    jest.clearAllMocks();
    (
      getPayrollExportLockSnapshot as jest.Mock
    ).mockResolvedValue(lockSnapshot);
    (
      ensurePayrollEntriesApproved as jest.Mock
    ).mockResolvedValue(undefined);
    (buildPayrollReportData as jest.Mock).mockResolvedValue(
      report,
    );
    (
      markPayrollPeriodAsExported as jest.Mock
    ).mockResolvedValue({
      id: 12,
    });
  });

  it('markerer først perioden efter CSV-filen er bygget', async () => {
    (buildPayrollCsvExport as jest.Mock).mockReturnValue(
      'csv-data',
    );

    await expect(
      exportPayrollCsvFlow(...params),
    ).resolves.toBe('csv-data');

    expect(buildPayrollCsvExport).toHaveBeenCalledWith(report);
    expect(markPayrollPeriodAsExported).toHaveBeenCalledWith(
      prisma,
      user,
      '2026-07-21',
      '2026-08-20',
      undefined,
      undefined,
      lockSnapshot,
    );
    expect(
      (buildPayrollCsvExport as jest.Mock).mock
        .invocationCallOrder[0],
    ).toBeLessThan(
      (markPayrollPeriodAsExported as jest.Mock).mock
        .invocationCallOrder[0],
    );
  });

  it('markerer ikke perioden, når CSV-genereringen fejler', async () => {
    (buildPayrollCsvExport as jest.Mock).mockImplementation(
      () => {
        throw new Error('CSV kunne ikke bygges');
      },
    );

    await expect(
      exportPayrollCsvFlow(...params),
    ).rejects.toThrow('CSV kunne ikke bygges');

    expect(markPayrollPeriodAsExported).not.toHaveBeenCalled();
  });

  it('markerer ikke perioden, når XLSX-genereringen fejler', async () => {
    (buildPayrollXlsxExport as jest.Mock).mockRejectedValue(
      new Error('XLSX kunne ikke bygges'),
    );

    await expect(
      exportPayrollXlsxFlow(...params),
    ).rejects.toThrow('XLSX kunne ikke bygges');

    expect(markPayrollPeriodAsExported).not.toHaveBeenCalled();
  });

  it('markerer ikke perioden, når PDF-genereringen fejler', async () => {
    (buildPayrollPdfExport as jest.Mock).mockRejectedValue(
      new Error('PDF kunne ikke bygges'),
    );

    await expect(
      exportPayrollPdfFlow(...params),
    ).rejects.toThrow('PDF kunne ikke bygges');

    expect(markPayrollPeriodAsExported).not.toHaveBeenCalled();
  });

  it('markerer ikke perioden, når Uniconta-genereringen fejler', async () => {
    (
      buildPayrollUnicontaCsvExport as jest.Mock
    ).mockImplementation(() => {
      throw new Error('Uniconta kunne ikke bygges');
    });

    await expect(
      exportPayrollUnicontaCsvFlow(
        prisma as never,
        {
          calculateSegments: jest.fn(),
        } as never,
        user as never,
        '2026-07-21',
        '2026-08-20',
      ),
    ).rejects.toThrow('Uniconta kunne ikke bygges');

    expect(markPayrollPeriodAsExported).not.toHaveBeenCalled();
  });

  it('markerer perioden efter en vellykket asynkron XLSX-generering', async () => {
    const buffer = Buffer.from('xlsx-data');
    (buildPayrollXlsxExport as jest.Mock).mockResolvedValue(
      buffer,
    );

    await expect(
      exportPayrollXlsxFlow(...params),
    ).resolves.toBe(buffer);

    expect(
      (buildPayrollXlsxExport as jest.Mock).mock
        .invocationCallOrder[0],
    ).toBeLessThan(
      (markPayrollPeriodAsExported as jest.Mock).mock
        .invocationCallOrder[0],
    );
  });
});
