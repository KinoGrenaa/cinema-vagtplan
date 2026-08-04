import type {
  PayrollAdjustmentHistoryItem,
} from "../../components/time-entries/PayrollAdjustmentHistoryPanel";

export type TimeEntryStatus =
  | "PENDING"
  | "NEEDS_CHANGES"
  | "APPROVED"
  | "VOIDED";

export type TimeEntryDeviation = {
  hasDeviation: boolean;
  requiresNote: boolean;
  types: string[];
  plannedMinutes: number | null;
  registeredMinutes: number | null;
  differenceMinutes: number | null;
  clockInDeviationMinutes:
    number | null;
  clockOutDeviationMinutes:
    number | null;
  messages: string[];
};

export type PayrollPeriodSummary = {
  id: number;
  startDate: string;
  endDate: string;
};

export type PayrollExportContext = {
  originalPayrollPeriod:
    PayrollPeriodSummary;
  adjustmentPayrollPeriod:
    PayrollPeriodSummary | null;
  hasPendingAdjustment: boolean;
  requiresConfirmation: boolean;
};

export type TimeEntry = {
  id: number;
  clockIn: string;
  clockOut?: string | null;
  status: TimeEntryStatus;
  note?: string | null;
  clockInNote?: string | null;
  clockOutNote?: string | null;
  adminNote?: string | null;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  shift?: {
    startTime?: string;
    endTime?: string;
    jobFunction?: {
      name: string;
    };
  } | null;
  payrollAdjustments?: {
    id: number;
    minutesDelta: number;
    reason: string;
    createdAt: string;
  }[];
  payrollAdjustmentHistory?:
    PayrollAdjustmentHistoryItem[];
  payrollExportContext?:
    PayrollExportContext | null;
  deviation?: TimeEntryDeviation;
};
