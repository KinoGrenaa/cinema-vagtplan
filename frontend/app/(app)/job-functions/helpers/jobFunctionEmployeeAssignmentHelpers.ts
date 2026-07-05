import type { User, UserJobFunction } from "./jobFunctionTypes";

export function getAssignedUserIds(
  assignments: UserJobFunction[],
): Set<number> {
  return new Set(assignments.map((assignment) => assignment.user.id));
}

export function getAvailableJobFunctionUsers(
  users: User[],
  assignments: UserJobFunction[],
): User[] {
  const assignedUserIds = getAssignedUserIds(assignments);
  return users.filter((user) => !assignedUserIds.has(user.id));
}

export function parseSelectedAssignmentUserId(
  selectedUserId: string,
): number | null {
  const userId = Number(selectedUserId);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}
