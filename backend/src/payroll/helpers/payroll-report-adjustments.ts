import {
  getOrCreatePayrollReportEmployeeGroup,
} from './payroll-report-groups';

import type {
  PayrollReportAdjustment,
  PayrollReportEmployeeGroup,
} from './payroll-report-types';

function toDateOnly(
  value: Date | null | undefined,
) {
  return value
    ? value.toISOString().slice(0, 10)
    : null;
}

export function addPayrollReportAdjustment(
  grouped: Map<
    number,
    PayrollReportEmployeeGroup
  >,
  adjustment:
    PayrollReportAdjustment,
) {
  const userGroup =
    getOrCreatePayrollReportEmployeeGroup(
      grouped,
      adjustment.userId,
      adjustment.user,
    );

  if (!userGroup) {
    return;
  }

  const payrollData =
    adjustment.payrollType ||
    adjustment.timeEntry.shift
      ?.workType?.payrollType ||
    null;
  const adjustmentHours =
    adjustment.minutesDelta / 60;

  userGroup.adjustmentCount += 1;
  userGroup.adjustmentHours +=
    adjustmentHours;
  userGroup.payrollAdjustments.push({
    id: adjustment.id,
    timeEntryId:
      adjustment.timeEntryId,
    type: adjustment.type,
    status: adjustment.status,
    exportCategory:
      adjustment.exportCategory,
    hours: Number(
      adjustmentHours.toFixed(2),
    ),
    exportedHours: Number(
      (
        adjustment.exportedMinutes /
        60
      ).toFixed(2),
    ),
    adjustedHours: Number(
      (
        adjustment.adjustedMinutes /
        60
      ).toFixed(2),
    ),
    previousHours:
      adjustment.previousMinutes ===
      null
        ? null
        : Number(
            (
              adjustment.previousMinutes /
              60
            ).toFixed(2),
          ),
    newHours:
      adjustment.newMinutes === null
        ? null
        : Number(
            (
              adjustment.newMinutes /
              60
            ).toFixed(2),
          ),
    reason: adjustment.reason,
    originalPayrollPeriodId:
      adjustment
        .originalPayrollPeriodId,
    originalPayrollPeriodStartDate:
      toDateOnly(
        adjustment
          .originalPayrollPeriod
          .startDate,
      )!,
    originalPayrollPeriodEndDate:
      toDateOnly(
        adjustment
          .originalPayrollPeriod
          .endDate,
      )!,
    settlementPayrollPeriodId:
      adjustment
        .settlementPayrollPeriodId,
    settlementPayrollPeriodStartDate:
      toDateOnly(
        adjustment
          .settlementPayrollPeriod
          ?.startDate,
      ),
    settlementPayrollPeriodEndDate:
      toDateOnly(
        adjustment
          .settlementPayrollPeriod
          ?.endDate,
      ),
    payrollCode:
      payrollData?.payrollCode ||
      'NORMAL',
    exportCode:
      payrollData?.exportCode ||
      payrollData?.payrollCode ||
      'NORMAL',
    payrollName:
      payrollData?.name ||
      'Normale timer',
    workType:
      adjustment.timeEntry.shift
        ?.workType?.name ||
      '-',
    createdAt:
      adjustment.createdAt.toISOString(),
  });
}
