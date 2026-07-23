import type { UserFormData, UserRole } from "./userTypes";

export const USER_PERMISSION_KEYS = [
  "canManageSchedule",
  "canManageUsers",
  "canManagePayroll",
  "canManageLeaveRequests",
  "canManageCinemaSettings",
  "canSendBroadcastMessages",
] as const;

export type UserPermissionKey = (typeof USER_PERMISSION_KEYS)[number];

export const USER_PERMISSION_FIELDS: readonly {
  key: UserPermissionKey;
  label: string;
}[] = [
  { key: "canManageSchedule", label: "Kan administrere vagtplan" },
  { key: "canManageUsers", label: "Kan administrere brugere" },
  { key: "canManagePayroll", label: "Kan administrere løn" },
  { key: "canManageLeaveRequests", label: "Kan administrere fravær" },
  {
    key: "canManageCinemaSettings",
    label: "Kan administrere biografindstillinger",
  },
  {
    key: "canSendBroadcastMessages",
    label: "Kan sende fællesbeskeder",
  },
];

const ROLE_REQUIRED_PERMISSION_KEYS: Record<
  UserRole,
  readonly UserPermissionKey[]
> = {
  MASTER: USER_PERMISSION_KEYS,
  ADMIN: USER_PERMISSION_KEYS,
  EMPLOYEE: [],
};

export function getRequiredPermissionKeys(role: UserRole) {
  return ROLE_REQUIRED_PERMISSION_KEYS[role] ?? [];
}

export function isPermissionRequiredForRole(
  role: UserRole,
  permission: UserPermissionKey,
) {
  return getRequiredPermissionKeys(role).includes(permission);
}

export function withRequiredRolePermissions<
  T extends { role: UserRole } & Partial<Record<UserPermissionKey, boolean>>,
>(user: T): T {
  const nextUser = { ...user } as T &
    Record<UserPermissionKey, boolean | undefined>;

  for (const permission of getRequiredPermissionKeys(user.role)) {
    nextUser[permission] = true;
  }

  return nextUser as T;
}

export function changeUserFormRole(
  user: UserFormData,
  nextRole: UserRole,
): UserFormData {
  if (user.role === nextRole) {
    return withRequiredRolePermissions(user);
  }

  const previousRequiredPermissions = new Set(
    getRequiredPermissionKeys(user.role),
  );
  const nextRequiredPermissions = new Set(
    getRequiredPermissionKeys(nextRole),
  );
  const nextUser: UserFormData = {
    ...user,
    role: nextRole,
  };

  for (const permission of USER_PERMISSION_KEYS) {
    if (nextRequiredPermissions.has(permission)) {
      nextUser[permission] = true;
      continue;
    }

    if (previousRequiredPermissions.has(permission)) {
      nextUser[permission] = false;
    }
  }

  return nextUser;
}
