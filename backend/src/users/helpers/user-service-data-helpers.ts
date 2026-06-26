import { UserRole } from './user-service-helpers';
import {
  OwnProfileUpdateInput,
  UserPermissionInput,
  UserUpdateInput,
} from './user-service-data-types';

export { ensureCinemaExists, validateRoleCinema } from './user-cinema-validation';
export {
  ensureUniqueUserEmail,
  findRequiredUser,
} from './user-email-lookup';
export type {
  OwnProfileUpdateInput,
  UserPermissionInput,
  UserUpdateInput,
} from './user-service-data-types';

export function getCreatePermissionData(
  role: UserRole,
  data: UserPermissionInput,
) {
  return {
    canManageSchedule:
      role === 'MASTER' ? true : (data.canManageSchedule ?? false),
    canManageUsers: role === 'MASTER' ? true : (data.canManageUsers ?? false),
    canManagePayroll:
      role === 'MASTER' ? true : (data.canManagePayroll ?? false),
    canManageLeaveRequests:
      role === 'MASTER' ? true : (data.canManageLeaveRequests ?? false),
    canManageCinemaSettings:
      role === 'MASTER' ? true : (data.canManageCinemaSettings ?? false),
    canSendBroadcastMessages:
      role === 'MASTER' ? true : (data.canSendBroadcastMessages ?? false),
  };
}

export function buildUserUpdateData(
  data: UserUpdateInput,
  nextRole: UserRole,
  nextCinemaId: number | null,
) {
  const updateData: any = {};

  if (data.email !== undefined) updateData.email = data.email;
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.role !== undefined) updateData.role = data.role;
  updateData.cinemaId = nextCinemaId;
  if (data.employmentType !== undefined) {
    updateData.employmentType = data.employmentType;
  }
  if (data.profileImage !== undefined) {
    updateData.profileImage = data.profileImage;
  }
  if (data.address !== undefined) updateData.address = data.address;
  if (data.birthDate !== undefined) {
    updateData.birthDate = data.birthDate ? new Date(data.birthDate) : null;
  }
  if (data.emergencyPhone !== undefined) {
    updateData.emergencyPhone = data.emergencyPhone;
  }
  if (data.hireDate !== undefined) {
    updateData.hireDate = data.hireDate ? new Date(data.hireDate) : null;
  }
  if (data.skills !== undefined) updateData.skills = data.skills;
  if (data.notes !== undefined) updateData.notes = data.notes;

  if (data.canManageSchedule !== undefined) {
    updateData.canManageSchedule =
      nextRole === 'MASTER' ? true : data.canManageSchedule;
  }
  if (data.canManageUsers !== undefined) {
    updateData.canManageUsers =
      nextRole === 'MASTER' ? true : data.canManageUsers;
  }
  if (data.canManagePayroll !== undefined) {
    updateData.canManagePayroll =
      nextRole === 'MASTER' ? true : data.canManagePayroll;
  }
  if (data.canManageLeaveRequests !== undefined) {
    updateData.canManageLeaveRequests =
      nextRole === 'MASTER' ? true : data.canManageLeaveRequests;
  }
  if (data.canManageCinemaSettings !== undefined) {
    updateData.canManageCinemaSettings =
      nextRole === 'MASTER' ? true : data.canManageCinemaSettings;
  }
  if (data.canSendBroadcastMessages !== undefined) {
    updateData.canSendBroadcastMessages =
      nextRole === 'MASTER' ? true : data.canSendBroadcastMessages;
  }

  if (nextRole === 'MASTER') {
    updateData.canManageSchedule = true;
    updateData.canManageUsers = true;
    updateData.canManagePayroll = true;
    updateData.canManageLeaveRequests = true;
    updateData.canManageCinemaSettings = true;
    updateData.canSendBroadcastMessages = true;
  }

  return updateData;
}

export function buildOwnProfileUpdateData(data: OwnProfileUpdateInput) {
  const updateData: any = {};

  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.profileImage !== undefined) {
    updateData.profileImage = data.profileImage;
  }
  if (data.address !== undefined) updateData.address = data.address;
  if (data.birthDate !== undefined) {
    updateData.birthDate = data.birthDate ? new Date(data.birthDate) : null;
  }
  if (data.emergencyPhone !== undefined) {
    updateData.emergencyPhone = data.emergencyPhone;
  }
  if (data.skills !== undefined) updateData.skills = data.skills;

  return updateData;
}
