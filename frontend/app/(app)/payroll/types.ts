export type PayrollEntryDeviation = {
  hasDeviation: boolean;
  requiresNote: boolean;
  types: string[];
  plannedMinutes?: number;
  registeredMinutes?: number;
  differenceMinutes?: number;
  clockInDeviationMinutes?: number;
  clockOutDeviationMinutes?: number;
  messages: string[];
};

export type PayrollEntry = {
  id?: number;
  date: string;
  clockIn: string;
  clockOut: string;
  hours: number;
  jobFunction: string;
  payrollCode?: string;
  exportCode?: string;
  payrollName?: string;
  status?: string;
  note?: string | null;
  adminNote?: string | null;
  payrollLocked?: boolean;
  payrollUnlockedByMaster?: boolean;
  payrollPeriodId?: number | null;
  deviation?: PayrollEntryDeviation;

  isPayrollAdjustment?: boolean;
  originalPayrollPeriodId?: number | null;
  adjustmentPayrollPeriodId?: number | null;
  payrollAdjustmentReason?: string | null;
};

export type PayrollAdjustment = {
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
  settlementPayrollPeriodId?: number | null;
  settlementPayrollPeriodStartDate?: string | null;
  settlementPayrollPeriodEndDate?: string | null;
  payrollCode: string;
  exportCode: string;
  payrollName: string;
  jobFunction: string;
  createdAt: string;
};

export type PayrollEmployee = {
  userId: number;
  name: string;
  email: string;
  employeeNumber?: string | null;
  payrollEmployeeId?: string | null;
  totalHours: number;
  deviationCount?: number;
  adjustmentCount?: number;
  payrollAdjustments?: PayrollAdjustment[];
  entries: PayrollEntry[];
};

export type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

export type PayrollPeriodModel =
  | "CALENDAR_MONTH"
  | "FIXED_DAY_TO_DAY"
  | "BIWEEKLY";

export type PayrollPayoutRule = "LAST_WEEKDAY_OF_MONTH" | "FIXED_DAY_OF_MONTH";

export type CinemaPayrollSettings = {
  id: number;
  name: string;
  payrollPeriodModel?: PayrollPeriodModel;
  payrollPeriodStartDay?: number;
  payrollPeriodEndDay?: number;
  payrollPeriodAnchorDate?: string | null;
  payrollPayoutRule?: PayrollPayoutRule;
  payrollPayoutDay?: number;
};

export type PayrollPeriod = {
  id: number;
  status: "OPEN" | "LOCKED" | "EXPORTED" | "UNLOCKED";
  lockedAt?: string | null;
  exportedAt?: string | null;
  unlockedAt?: string | null;
};

export type PayrollAuditHistory = {
  id: number;
  status: "OPEN" | "LOCKED" | "EXPORTED" | "UNLOCKED";
  startDate: string;
  endDate: string;
  lockedAt?: string | null;
  lockedByUserId?: number | null;
  exportedAt?: string | null;
  exportedByUserId?: number | null;
  unlockedAt?: string | null;
  unlockedByUserId?: number | null;
  unlockNote?: string | null;
};

export type PayrollCounts = {
  pendingCount: number;
  voidedCount: number;
  adjustmentCount: number;
};

export type PayrollReportResponse = {
  employees: PayrollEmployee[];
  pendingCount: number;
  voidedCount: number;
  adjustmentCount: number;
};

export type PayrollPeriodStatusProps = {
  period: PayrollPeriod | null;
  periodLoading: boolean;
  periodLoadFailed: boolean;
  reportLoading: boolean;
  reportLoadFailed: boolean;
  totalHours: number;
  pendingCount: number;
  voidedCount: number;
  locking: boolean;
  unlocking: boolean;
  exporting: boolean;
  adjustmentCount: number;
  onLockPeriod: () => void;
  onUnlockPeriod: () => void;
  onOpenExportModal: () => void;
  onOpenTimeApproval: () => void;
};

export type PayrollWarningsProps = {
  pendingCount: number;
  voidedCount: number;
  adjustmentCount: number;
  onOpenTimeApproval: () => void;
};
