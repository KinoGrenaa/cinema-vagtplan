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
  userId: number;
  user?: {
    firstName: string;
    lastName: string;
  };
  workType?: {
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

export type StaffingHealth = "STABLE" | "HIGH_PRESSURE" | "CRITICAL";
