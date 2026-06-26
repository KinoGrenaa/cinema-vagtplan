import { addPayrollReportAdjustment } from './payroll-report-adjustments';
import { addPayrollReportEntry } from './payroll-report-entries';
import type {
  PayrollReportAdjustment,
  PayrollReportEmployeeGroup,
  PayrollReportTimeEntry,
} from './payroll-report-types';

export function buildPayrollReportResult(
  entries: PayrollReportTimeEntry[],
  payrollAdjustments: PayrollReportAdjustment[],
  pendingCount: number,
  voidedCount: number,
) {
  const legacyAdjustmentCount = entries.filter(
    (entry) => entry.isPayrollAdjustment,
  ).length;

  const grouped = new Map<number, PayrollReportEmployeeGroup>();

  for (const entry of entries) {
    addPayrollReportEntry(grouped, entry);
  }

  for (const adjustment of payrollAdjustments) {
    addPayrollReportAdjustment(grouped, adjustment);
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
