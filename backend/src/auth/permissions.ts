import { Role } from '@prisma/client';

export const PERMISSIONS = {
  canManageSchedule: true,
  canManageUsers: true,
  canManagePayroll: true,
  canManageLeaveRequests: true,
  canManageCinemaSettings: true,
  canSendBroadcastMessages: true,
};

export type PermissionKey = keyof typeof PERMISSIONS;

export function hasPermission(user: any, permission?: PermissionKey) {
  if (user.role === Role.MASTER) return true;
  if (user.role === Role.ADMIN) return true;
  if (!permission) return false;

  return Boolean(user[permission]);
}
