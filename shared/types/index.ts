export type Role =
  | "MASTER"
  | "ADMIN"
  | "EMPLOYEE";

export type LeaveStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export type TimeEntryStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export type ShiftTradeStatus =
  | "OPEN"
  | "ACCEPTED"
  | "CANCELLED";

export type User = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: Role;
  cinemaId: number | null;
  profileImage?: string | null;
};

export type JobFunctionTimingRule = {
  filmWindowStartMinute: number;
  filmWindowEndMinute: number;
  startAnchor: string;
  startOffsetMinutes: number;
  startFixedMinute?: number | null;
  endAnchor: string;
  endOffsetMinutes: number;
  endFixedMinute?: number | null;
  fallbackStartMinute?: number | null;
  fallbackEndMinute?: number | null;
  roundStartToNearestQuarter?: boolean;
  roundEndToNearestQuarter?: boolean;
  restrictMovieStartsToWindow?: boolean;
  isActive?: boolean;
};

export type JobFunction = {
  id: number;
  name: string;
  color: string;
  timingRule?: JobFunctionTimingRule | null;
};

export type Shift = {
  id: number;
  startTime: string;
  endTime: string;
  note?: string | null;
  userId: number;
  jobFunctionId: number;
  user: User;
  jobFunction: JobFunction;
};

export type TimeEntry = {
  id: number;
  clockIn: string;
  clockOut?: string | null;
  note?: string | null;
  adminNote?: string | null;
  status: TimeEntryStatus;
  userId: number;
  shiftId?: number | null;
  shift?: Shift | null;
};

export type LeaveRequest = {
  id: number;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: LeaveStatus;
  userId: number;
  user: User;
};

export type Message = {
  id: number;
  subject: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
  senderId: number;
  receiverId?: number | null;
  isBroadcast: boolean;
};

export type CurrentUser = {
  id: number;
  email: string;
  role: Role;
  cinemaId: number | null;
  defaultCinemaId?: number | null;
  firstName?: string;
  lastName?: string;
  canManageSchedule?: boolean;
  canManageUsers?: boolean;
  canManagePayroll?: boolean;
  canManageLeaveRequests?: boolean;
  canManageCinemaSettings?: boolean;
  canSendBroadcastMessages?: boolean;
};
