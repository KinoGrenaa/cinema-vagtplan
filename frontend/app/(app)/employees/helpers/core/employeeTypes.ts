export type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  cinemaId?: number | null;
  canManageSchedule?: boolean;
  canManageUsers?: boolean;
  canManagePayroll?: boolean;
  canManageLeaveRequests?: boolean;
  canManageCinemaSettings?: boolean;
  canSendBroadcastMessages?: boolean;
};

export type StoredUser = {
  id?: number;
  sub?: number;
  role?: "MASTER" | "ADMIN" | "EMPLOYEE";
  cinemaId?: number | null;
};

export type PermissionKey =
  | "canManageSchedule"
  | "canManageUsers"
  | "canManagePayroll"
  | "canManageLeaveRequests"
  | "canManageCinemaSettings"
  | "canSendBroadcastMessages";
