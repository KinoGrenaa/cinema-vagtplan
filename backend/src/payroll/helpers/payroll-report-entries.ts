import { analyzePayrollTimeEntryDeviation } from './payroll-deviation';
import { resolvePayrollData } from './payroll-export';
import {
  dateToCopenhagenDateString,
  getPayrollReferenceDate,
} from './payroll-periods';
import { getOrCreatePayrollReportEmployeeGroup } from './payroll-report-groups';
import type {
  PayrollReportEmployeeGroup,
  PayrollReportTimeEntry,
} from './payroll-report-types';

export function addPayrollReportEntry(
  grouped: Map<number, PayrollReportEmployeeGroup>,
  entry: PayrollReportTimeEntry,
) {
  if (!entry.clockOut) return;

  const hours =
    (entry.clockOut.getTime() - entry.clockIn.getTime()) / 1000 / 60 / 60;

  const userGroup = getOrCreatePayrollReportEmployeeGroup(
    grouped,
    entry.userId,
    entry.user,
  );

  if (!userGroup) return;

  const payrollData = resolvePayrollData(entry);
  const deviation = analyzePayrollTimeEntryDeviation(entry);

  userGroup.totalHours += hours;

  if (deviation.hasDeviation) {
    userGroup.deviationCount += 1;
  }

  if (entry.isPayrollAdjustment) {
    userGroup.adjustmentCount += 1;
    userGroup.adjustmentHours += hours;
  }

  userGroup.entries.push({
    id: entry.id,
    date: dateToCopenhagenDateString(getPayrollReferenceDate(entry)),
    clockIn: entry.clockIn.toISOString(),
    clockOut: entry.clockOut.toISOString(),
    hours: Number(hours.toFixed(2)),
    jobFunction: entry.shift?.jobFunctionNameSnapshot || entry.shift?.jobFunction?.name || '-',
    payrollCode: payrollData.payrollCode,
    exportCode: payrollData.exportCode,
    payrollName: payrollData.payrollName,
    status: entry.status,
    note: entry.note,
    adminNote: entry.adminNote,
    payrollLocked: entry.payrollLocked,
    payrollUnlockedByMaster: entry.payrollUnlockedByMaster,
    payrollPeriodId: entry.payrollPeriodId,
    deviation,
    isPayrollAdjustment: entry.isPayrollAdjustment,
    originalPayrollPeriodId: entry.originalPayrollPeriodId,
    adjustmentPayrollPeriodId: entry.adjustmentPayrollPeriodId,
    payrollAdjustmentReason: entry.payrollAdjustmentReason,
  });
}
