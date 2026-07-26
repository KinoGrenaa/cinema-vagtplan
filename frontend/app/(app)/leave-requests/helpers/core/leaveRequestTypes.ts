export type LeaveStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

export type LeaveStatusFilters = {
  pending: boolean;
  approved: boolean;
  rejected: boolean;
  cancelled: boolean;
  expired: boolean;
};

export type LeaveStatusCounts = {
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  expired: number;
};

export const DEFAULT_STATUS_FILTERS: LeaveStatusFilters = {
  pending: true,
  approved: false,
  rejected: false,
  cancelled: false,
  expired: false,
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

export type LeaveRequestPageResponse = {
  items: LeaveRequest[];
  hasMore: boolean;
  nextBeforeId:
    number | null;
  totalCount: number;
  statusCounts: Record<
    LeaveStatus,
    number
  >;
  target:
    LeaveRequest | null;
};
