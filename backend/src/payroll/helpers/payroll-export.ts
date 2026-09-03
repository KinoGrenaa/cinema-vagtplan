import {
  MANUAL_ENTRY_PAYROLL_CODE,
  MANUAL_ENTRY_PAYROLL_NAME,
} from '../../payroll-types/helpers/payroll-type-system';

export type PayrollData = {
  payrollCode: string;
  exportCode: string;
  payrollName: string;
};

export type PayrollExportSegment = {
  hours: number;
  exportCode: string;
  payrollName: string;
};

export function resolvePayrollData(timeEntry: any): PayrollData {
  const directPayrollType = timeEntry.payrollType;
  if (directPayrollType) {
    return {
      payrollCode: directPayrollType.payrollCode,
      exportCode: directPayrollType.exportCode || directPayrollType.payrollCode,
      payrollName: directPayrollType.name,
    };
  }

  const jobFunctionExportCode = timeEntry.shift?.jobFunction?.defaultPayrollExportCode;
  if (jobFunctionExportCode) {
    return {
      payrollCode: jobFunctionExportCode.payrollCode,
      exportCode: jobFunctionExportCode.exportCode || jobFunctionExportCode.payrollCode,
      payrollName: jobFunctionExportCode.name,
    };
  }

  if (!timeEntry.shift) {
    return {
      payrollCode: MANUAL_ENTRY_PAYROLL_CODE,
      exportCode: MANUAL_ENTRY_PAYROLL_CODE,
      payrollName: MANUAL_ENTRY_PAYROLL_NAME,
    };
  }

  const fallbackName =
    timeEntry.shift?.jobFunctionNameSnapshot ||
    timeEntry.shift?.jobFunction?.name ||
    'Vagt';

  return {
    payrollCode: fallbackName.toUpperCase(),
    exportCode: fallbackName.toUpperCase(),
    payrollName: fallbackName,
  };
}

export function getSimplePayrollSegment(entry: {
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

export function formatPayrollCsvRows(rows: unknown[][]) {
  return rows
    .map((row) =>
      row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'),
    )
    .join('\n');
}
