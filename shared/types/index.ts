export type Role = "MASTER" | "ADMIN" | "EMPLOYEE";

export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export type TimeEntryStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ShiftTradeStatus = "OPEN" | "ACCEPTED" | "CANCELLED";

export type User = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: Role;
  cinemaId: number;
  profileImage?: string | null;
};

export type WorkType = {
  id: number;
  name: string;
  color: string;
};

export type Shift = {
  id: number;
  startTime: string;
  endTime: string;
  note?: string | null;
  userId: number;
  workTypeId: number;
  user: User;
  workType: WorkType;
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
  cinemaId: number;
  firstName?: string;
  lastName?: string;
};
