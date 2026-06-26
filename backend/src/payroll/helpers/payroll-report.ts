import {
  analyzePayrollTimeEntryDeviation,
  type TimeEntryDeviation,
} from './payroll-deviation';
import {
  dateToCopenhagenDateString,
  getPayrollReferenceDate,
} from './payroll-periods';
import { resolvePayrollData } from './payroll-export';

type PayrollReportTimeEntry = any;
type PayrollReportAdjustment = any;

type PayrollReportUser = {
  firstName: string;
  lastName: string;
  email: string;
  employeeNumber: string | null;
  payrollEmployeeId: string | null;
};

type PayrollReportEmployeeGroup = {
  userId: number;
  name: string;
  email: string;
  employeeNumber: string | null;
  payrollEmployeeId: string | null;
  totalHours: number;
  adjustmentHours: number;
  deviationCount: number;
  adjustmentCount: number;
  entries: {
    id: number;
    date: string;
    clockIn: string;
    clockOut: string;
    hours: number;
    workType: string;
    payrollCode: string;
    exportCode: string;
    payrollName: string;
    status: string;
    note: string | null;
    adminNote: string | null;
    payrollLocked: boolean;
    payrollUnlockedByMaster: boolean;
    payrollPeriodId: number | null;
    deviation: TimeEntryDeviation;
    isPayrollAdjustment: boolean;
    originalPayrollPeriodId: number | null;
    adjustmentPayrollPeriodId: number | null;
    payrollAdjustmentReason: string | null;
  }[];
  payrollAdjustments: {
    id: number;
    timeEntryId: number;
    type: string;
    status: string;
    exportCategory: string;
    hours: number;
    exportedHours: number;
    adjustedHours: number;
    previousHours: number | null;
    newHours: number | null;
    reason: string;
    originalPayrollPeriodId: number;
    originalPayrollPeriodStartDate: string;
    originalPayrollPeriodEndDate: string;
    settlementPayrollPeriodId: number | null;
    payrollCode: string;
    exportCode: string;
    payrollName: string;
    workType: string;
    createdAt: string;
  }[];
};

function createPayrollReportEmployeeGroup(
  userId: number,
  user: PayrollReportUser,
): PayrollReportEmployeeGroup {
  return {
    userId,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    employeeNumber: user.employeeNumber,
    payrollEmployeeId: user.payrollEmployeeId,
    totalHours: 0,
    adjustmentHours: 0,
    deviationCount: 0,
    adjustmentCount: 0,
    entries: [],
    payrollAdjustments: [],
  };
}

function getOrCreatePayrollReportEmployeeGroup(
  grouped: Map<number, PayrollReportEmployeeGroup>,
  userId: number,
  user: PayrollReportUser,
) {
  if (!grouped.has(userId)) {
    grouped.set(userId, createPayrollReportEmployeeGroup(userId, user));
  }

  return grouped.get(userId);
}

function addPayrollReportEntry(
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
    workType: entry.shift?.workType?.name || '-',
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

function addPayrollReportAdjustment(
  grouped: Map<number, PayrollReportEmployeeGroup>,
  adjustment: PayrollReportAdjustment,
) {
  const userGroup = getOrCreatePayrollReportEmployeeGroup(
    grouped,
    adjustment.userId,
    adjustment.user,
  );

  if (!userGroup) return;

  const payrollData =
    adjustment.payrollType ||
    adjustment.timeEntry.shift?.workType?.payrollType ||
    null;

  const adjustmentHours = adjustment.minutesDelta / 60;

  userGroup.adjustmentCount += 1;
  userGroup.adjustmentHours += adjustmentHours;

  userGroup.payrollAdjustments.push({
    id: adjustment.id,
    timeEntryId: adjustment.timeEntryId,
    type: adjustment.type,
    status: adjustment.status,
    exportCategory: adjustment.exportCategory,
    hours: Number(adjustmentHours.toFixed(2)),
    exportedHours: Number((adjustment.exportedMinutes / 60).toFixed(2)),
    adjustedHours: Number((adjustment.adjustedMinutes / 60).toFixed(2)),
    previousHours:
      adjustment.previousMinutes === null
        ? null
        : Number((adjustment.previousMinutes / 60).toFixed(2)),
    newHours:
      adjustment.newMinutes === null
        ? null
        : Number((adjustment.newMinutes / 60).toFixed(2)),
    reason: adjustment.reason,
    originalPayrollPeriodId: adjustment.originalPayrollPeriodId,
    originalPayrollPeriodStartDate: adjustment.originalPayrollPeriod.startDate
      .toISOString()
      .slice(0, 10),
    originalPayrollPeriodEndDate: adjustment.originalPayrollPeriod.endDate
      .toISOString()
      .slice(0, 10),
    settlementPayrollPeriodId: adjustment.settlementPayrollPeriodId,
    payrollCode: payrollData?.payrollCode || 'NORMAL',
    exportCode: payrollData?.exportCode || payrollData?.payrollCode || 'NORMAL',
    payrollName: payrollData?.name || 'Normale timer',
    workType: adjustment.timeEntry.shift?.workType?.name || '-',
    createdAt: adjustment.createdAt.toISOString(),
  });
}

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
