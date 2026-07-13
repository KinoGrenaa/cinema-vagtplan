export type LeaveStatus =
  "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "EXPIRED";

export type LeaveRequestUser = {
  id: number;
  firstName: string;
  lastName: string;
};

export type LeaveRequest = {
  id: number;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: LeaveStatus;
  createdAt?: string;
  user: LeaveRequestUser;
  createdByUser?: LeaveRequestUser | null;
};

export type LeaveDisplayDateRange = {
  startDate: string;
  endDate: string;
};

export type LeaveDateGroup = {
  key: string;
  title: string;
  sortTime: number;
  requests: LeaveRequest[];
};

export type GroupedLeaveRequests = {
  userId: number;
  userName: string;
  requests: LeaveRequest[];
  dateGroups: LeaveDateGroup[];
};

export type LeaveStatusFilters = {
  pending: boolean;
  expired: boolean;
  approved: boolean;
  rejected: boolean;
  cancelled: boolean;
};

export const DEFAULT_STATUS_FILTERS: LeaveStatusFilters = {
  pending: true,
  expired: false,
  approved: false,
  rejected: false,
  cancelled: false,
};

export type StoredUser = {
  id?: number;
  sub?: number;
  role?: "MASTER" | "ADMIN" | "EMPLOYEE";
  cinemaId?: number | null;
};
