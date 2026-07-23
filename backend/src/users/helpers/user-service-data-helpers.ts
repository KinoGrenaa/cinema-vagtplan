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

const USER_PERMISSION_KEYS = [
  'canManageSchedule',
  'canManageUsers',
  'canManagePayroll',
  'canManageLeaveRequests',
  'canManageCinemaSettings',
  'canSendBroadcastMessages',
] as const;

type UserPermissionKey = (typeof USER_PERMISSION_KEYS)[number];

const ROLE_REQUIRED_PERMISSION_KEYS: Record<
  UserRole,
  readonly UserPermissionKey[]
> = {
  MASTER: USER_PERMISSION_KEYS,
  ADMIN: USER_PERMISSION_KEYS,
  EMPLOYEE: [],
};

function isPermissionRequiredForRole(
  role: UserRole,
  permission: UserPermissionKey,
) {
  return ROLE_REQUIRED_PERMISSION_KEYS[role].includes(permission);
}

export function getCreatePermissionData(
  role: UserRole,
  data: UserPermissionInput,
) {
  return {
    canManageSchedule:
      isPermissionRequiredForRole(role, 'canManageSchedule') ||
      (data.canManageSchedule ?? false),
    canManageUsers:
      isPermissionRequiredForRole(role, 'canManageUsers') ||
      (data.canManageUsers ?? false),
    canManagePayroll:
      isPermissionRequiredForRole(role, 'canManagePayroll') ||
      (data.canManagePayroll ?? false),
    canManageLeaveRequests:
      isPermissionRequiredForRole(role, 'canManageLeaveRequests') ||
      (data.canManageLeaveRequests ?? false),
    canManageCinemaSettings:
      isPermissionRequiredForRole(role, 'canManageCinemaSettings') ||
      (data.canManageCinemaSettings ?? false),
    canSendBroadcastMessages:
      isPermissionRequiredForRole(role, 'canSendBroadcastMessages') ||
      (data.canSendBroadcastMessages ?? false),
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

  const roleIsBeingChanged = data.role !== undefined;

  for (const permission of USER_PERMISSION_KEYS) {
    if (isPermissionRequiredForRole(nextRole, permission)) {
      updateData[permission] = true;
      continue;
    }

    if (data[permission] !== undefined) {
      updateData[permission] = data[permission];
      continue;
    }

    if (roleIsBeingChanged) {
      updateData[permission] = false;
    }
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
