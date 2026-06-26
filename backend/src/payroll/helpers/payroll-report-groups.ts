import type {
  PayrollReportEmployeeGroup,
  PayrollReportUser,
} from './payroll-report-types';

export function createPayrollReportEmployeeGroup(
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

export function getOrCreatePayrollReportEmployeeGroup(
  grouped: Map<number, PayrollReportEmployeeGroup>,
  userId: number,
  user: PayrollReportUser,
) {
  if (!grouped.has(userId)) {
    grouped.set(userId, createPayrollReportEmployeeGroup(userId, user));
  }

  return grouped.get(userId);
}
