import { EmploymentType, UserRole } from './user-service-helpers';

export type UserPermissionInput = {
  canManageSchedule?: boolean;
  canManageUsers?: boolean;
  canManagePayroll?: boolean;
  canManageLeaveRequests?: boolean;
  canManageCinemaSettings?: boolean;
  canSendBroadcastMessages?: boolean;
};

export type UserUpdateInput = UserPermissionInput & {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: UserRole;
  employmentType?: EmploymentType;
  profileImage?: string;
  address?: string;
  birthDate?: string | null;
  emergencyPhone?: string;
  hireDate?: string | null;
  skills?: string;
  notes?: string;
};

export type OwnProfileUpdateInput = {
  email?: string;
  phone?: string;
  profileImage?: string;
  address?: string;
  birthDate?: string | null;
  emergencyPhone?: string;
  skills?: string;
};
