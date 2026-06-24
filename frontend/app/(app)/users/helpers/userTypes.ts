export type UserRole = "MASTER" | "ADMIN" | "EMPLOYEE";
export type EmploymentType = "HOURLY" | "SALARIED";

export type CurrentUser = {
  id?: number;
  sub?: number;
  role: UserRole;
  cinemaId: number | null;
};

export type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  employmentType?: EmploymentType;
  isActive?: boolean;
  deactivatedAt?: string | null;
  canManageSchedule?: boolean;
  canManageUsers?: boolean;
  canManagePayroll?: boolean;
  canManageLeaveRequests?: boolean;
  canManageCinemaSettings?: boolean;
  canSendBroadcastMessages?: boolean;
  cinemaId?: number | null;
  cinema?: {
    id: number;
    name: string;
  } | null;
};

export type UserFormData = {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  phone?: string;
  role: UserRole;
  employmentType: EmploymentType;
  canManageSchedule: boolean;
  canManageUsers: boolean;
  canManagePayroll: boolean;
  canManageLeaveRequests: boolean;
  canManageCinemaSettings: boolean;
  canSendBroadcastMessages: boolean;
};

export const emptyUser: UserFormData = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phone: "",
  role: "EMPLOYEE",
  employmentType: "HOURLY",
  canManageSchedule: false,
  canManageUsers: false,
  canManagePayroll: false,
  canManageLeaveRequests: false,
  canManageCinemaSettings: false,
  canSendBroadcastMessages: false,
};
