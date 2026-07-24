import type { TimeEntryDeviation } from './payroll-deviation';

export type PayrollReportTimeEntry = any;
export type PayrollReportAdjustment = any;

export type PayrollReportUser = {
  firstName: string;
  lastName: string;
  email: string;
  cinemaMemberships?: Array<{
    hireDate: Date | null;
    employeeNumber: string | null;
    payrollEmployeeId: string | null;
  }>;
};

export type PayrollReportEmployeeGroup = {
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
    settlementPayrollPeriodStartDate: string | null;
    settlementPayrollPeriodEndDate: string | null;
    payrollCode: string;
    exportCode: string;
    payrollName: string;
    workType: string;
    createdAt: string;
  }[];
};
