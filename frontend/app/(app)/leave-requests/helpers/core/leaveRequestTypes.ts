export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type LeaveStatusFilters = {
  pending: boolean;
  approved: boolean;
  rejected: boolean;
  cancelled: boolean;
};

export type LeaveStatusCounts = {
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
};

export const DEFAULT_STATUS_FILTERS: LeaveStatusFilters = {
  pending: true,
  approved: false,
  rejected: false,
  cancelled: false,
};

export type LeaveRequest = {
  id: number;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: LeaveStatus;
  user: {
    id: number;
    firstName: string;
    lastName: string;
  };
};
