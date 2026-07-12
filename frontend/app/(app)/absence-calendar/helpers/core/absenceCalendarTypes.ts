export type User = {
  id: number;
  firstName: string;
  lastName: string;
};

export type LeaveRequest = {
  id: number;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  user: User;
};
