export type User = {
  id: number;
  firstName: string;
  lastName: string;
};

export type LeaveRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

export type LeaveRequest = {
  id: number;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: LeaveRequestStatus;
  createdAt?: string;
  user: User;
  createdByUser?: User | null;
  cancelledAt?: string | null;
  cancelledByUser?: User | null;
  cancellationNote?: string | null;
  rejectedAt?: string | null;
  rejectedByUser?: User | null;
  rejectionNote?: string | null;
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
