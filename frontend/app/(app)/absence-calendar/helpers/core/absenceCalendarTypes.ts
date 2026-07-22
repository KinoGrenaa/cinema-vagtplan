export type User = {
  id: number;
  firstName: string;
  lastName: string;
};

export type LeaveRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type LeaveRequest = {
  id: number;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: LeaveRequestStatus;
  user: User;
};

export type AbsenceCalendarStatusFilter =
  | "ALL"
  | "PENDING"
  | "APPROVED";

export type AbsenceCalendarSummary = {
  approvedRequests: number;
  pendingRequests: number;
  employeeCount: number;
  absenceDays: number;
};
