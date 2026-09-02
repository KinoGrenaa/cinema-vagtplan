export type CurrentUser = {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  cinemaId: number;
};

export type Shift = {
  id: number;
  startTime: string;
  endTime: string;
  userId: number | null;
  user?: {
    firstName: string;
    lastName: string;
  };
  jobFunction?: {
    name: string;
  };
};

export type TimeEntry = {
  id: number;
  clockIn: string;
  clockOut?: string | null;
};

export type LeaveRequest = {
  id: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export type ShiftTrade = {
  id: number;
  status: "OPEN" | "ACCEPTED" | "CANCELLED";
};

export type MovieShowing = {
  id: number;
  title?: string;
  hall?: string;
  startTime?: string;
  endTime?: string;
  soldSeats: number;
  freeSeats: number;
};

export type StaffingHealth =
  | "UNKNOWN"
  | "STABLE"
  | "HIGH_PRESSURE"
  | "CRITICAL";

export type DashboardSourceKey =
  | "shifts"
  | "timeEntries"
  | "leaveRequests"
  | "shiftTrades"
  | "movies";

export type DashboardSourceState =
  | "disabled"
  | "fresh"
  | "stale"
  | "unavailable";

export type DashboardSourceStatus = {
  state: DashboardSourceState;
  message?: string;
};

export type DashboardSourceStatusMap = Record<
  DashboardSourceKey,
  DashboardSourceStatus
>;
