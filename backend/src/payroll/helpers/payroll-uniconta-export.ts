import {
  formatPayrollCsvRows,
  getSimplePayrollSegment,
} from './payroll-export';

export function buildPayrollUnicontaCsvExport(
  report: any,
  usePayrollRules: boolean,
  calculateSegments: (entry: any) => any[],
) {
  const rows = [['Employee', 'PayrollCode', 'Date', 'Hours', 'Text']];

  for (const employee of report.employees) {
    for (const entry of employee.entries) {
      const segments = usePayrollRules
        ? calculateSegments(entry)
        : getSimplePayrollSegment(entry);

      for (const segment of segments) {
        rows.push([
          employee.payrollEmployeeId || employee.employeeNumber || employee.email,
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
