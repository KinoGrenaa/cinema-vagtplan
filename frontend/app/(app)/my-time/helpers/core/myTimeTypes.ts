import type { TimeEntryStatus } from "./myTimeStatus";

export type TimeEntry = {
  id: number;
  clockIn: string;
  clockOut?: string | null;
  status: TimeEntryStatus;
  note?: string | null;
  clockInNote?: string | null;
  clockOutNote?: string | null;
  adminNote?: string | null;
  payrollType?: {
    name: string;
  } | null;
  shift?: {
    workType?: {
      name: string;
    } | null;
  } | null;
  payrollAdjustments?: {
    id: number;
    minutesDelta: number;
    reason?: string | null;
    createdAt?: string;
  }[];
};

export type TimeEntryRevision = {
  id: number;
  action: string;
  reason?: string | null;
  createdAt: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  previousClockIn?: string | null;
  newClockIn?: string | null;
  previousClockOut?: string | null;
  newClockOut?: string | null;
  previousClockInNote?: string | null;
  newClockInNote?: string | null;
  previousClockOutNote?: string | null;
  newClockOutNote?: string | null;
  previousAdminNote?: string | null;
  newAdminNote?: string | null;
  changedByUser?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
};
