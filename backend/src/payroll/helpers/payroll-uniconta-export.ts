import { formatPayrollCsvRows } from './payroll-export';

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function decimal(value: number) {
  return value.toFixed(2).replace('.', ',');
}

export function buildPayrollUnicontaCsvExport(report: any) {
  const rows = [
    ['Employee', 'PayrollCode', 'Date', 'Hours', 'Amount', 'Text'],
  ];
  const entryContext = new Map<
    number,
    {
      employee: any;
      entry: any;
    }
  >();
  for (const employee of report.employees ?? []) {
    for (const entry of employee.entries ?? []) {
      entryContext.set(entry.id, { employee, entry });
    }
  }

  for (const line of report.payrollCalculation?.lines ?? []) {
    if (!line.timeEntryId || !['HOURS', 'BASE_PAY', 'SUPPLEMENT'].includes(line.lineType)) {
      continue;
    }
    const context = entryContext.get(line.timeEntryId);
    if (!context) continue;
    const payrollType = line.payrollType;
    const code =
      payrollType?.exportCode ||
      payrollType?.payrollCode ||
      context.entry.exportCode ||
      'NORMAL';
    const name =
      line.payRuleVersion?.payRule?.name ||
      payrollType?.name ||
      (line.lineType === 'SUPPLEMENT' ? 'Tillæg' : 'Normale timer');
    rows.push([
      context.employee.payrollEmployeeId ||
        context.employee.employeeNumber ||
        context.employee.email,
      code,
      context.entry.date,
      decimal(numberValue(line.minutes) / 60),
      decimal(numberValue(line.roundedAmount)),
      `${context.entry.jobFunction} - ${name}`,
    ]);
  }

  for (const employee of report.employees ?? []) {
    for (const adjustment of employee.payrollAdjustments ?? []) {
      if (adjustment.amountDelta === null || adjustment.amountDelta === undefined) {
        continue;
      }
      rows.push([
        employee.payrollEmployeeId || employee.employeeNumber || employee.email,
        adjustment.exportCode || adjustment.payrollCode || 'NORMAL',
        String(adjustment.createdAt).slice(0, 10),
        decimal(0),
        decimal(numberValue(adjustment.amountDelta)),
        `${adjustment.jobFunction} - Efterregulering: ${adjustment.reason}`,
      ]);
    }
  }

  return formatPayrollCsvRows(rows);
}
