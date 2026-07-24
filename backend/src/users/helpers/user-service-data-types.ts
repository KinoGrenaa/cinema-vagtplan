import {
  UserRole,
} from './user-service-helpers';

export type UserPermissionInput = {
  canManageSchedule?: boolean;
  canManageUsers?: boolean;
  canManagePayroll?: boolean;
  canManageLeaveRequests?: boolean;
  canManageCinemaSettings?: boolean;
  canSendBroadcastMessages?: boolean;
};

export type UserUpdateInput = {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: UserRole;
  profileImage?: string;
  address?: string;
  birthDate?: string | null;
  emergencyPhone?: string;
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
