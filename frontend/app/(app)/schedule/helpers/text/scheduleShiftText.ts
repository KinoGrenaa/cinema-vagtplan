import { formatDateDK, formatTimeDK } from "@/app/utils/dateTime";
import type { Shift, User } from "../../../../../../shared/types";
import type { StaffingRequestType } from "../../components/staffing/StaffingRequestModal";

export function formatShiftDate(value: string) {
  return formatDateDK(value);
}

export function formatShiftTimeRange(shift: Shift) {
  return `${formatTimeDK(shift.startTime)} - ${formatTimeDK(shift.endTime)}`;
}

export function getShiftWorkTypeName(shift: Shift) {
  const maybeShift = shift as Shift & {
    workType?: {
      name?: string;
    };
  };

  return maybeShift.workType?.name ?? `Arbejdstype #${shift.workTypeId}`;
}

export function getShiftConfirmText(shift: Shift) {
  return `${getShiftWorkTypeName(shift)} ${formatShiftDate(
    shift.startTime,
  )} ${formatShiftTimeRange(shift)}`;
}

export function getUserDisplayName(user: User) {
  return (
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
    user.email ||
    `Medarbejder #${user.id}`
  );
}

export function getShiftUserId(shift: Shift) {
  return (shift as Shift & { userId?: number | null }).userId ?? null;
}

export function getShiftUserDisplayName(shift: Shift, users: User[]) {
  const shiftWithUser = shift as Shift & {
    user?: {
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
    } | null;
  };

  const directName = `${shiftWithUser.user?.firstName ?? ""} ${
    shiftWithUser.user?.lastName ?? ""
  }`.trim();

  if (directName) {
    return directName;
  }

  if (shiftWithUser.user?.email) {
    return shiftWithUser.user.email;
  }

  const shiftUserId = getShiftUserId(shift);
  if (!shiftUserId) {
    return "Ikke tildelt";
  }

  const listedUser = users.find((candidate) => candidate.id === shiftUserId);
  return listedUser ? getUserDisplayName(listedUser) : `Medarbejder #${shiftUserId}`;
}

export function getStaffingShiftOptionText(shift: Shift, users: User[]) {
  return `${formatShiftTimeRange(shift)} · ${getShiftWorkTypeName(
    shift,
  )} · ${getShiftUserDisplayName(shift, users)}`;
}

export function getDefaultStaffingMessage(
  shift: Shift | null,
  type: StaffingRequestType,
) {
  if (shift) {
    return `Kan du hjælpe med denne vagt? ${getShiftConfirmText(shift)}`;
  }

  if (type === "EMERGENCY") {
    return "Der er akut brug for ekstra bemanding.\nKan du hjælpe?";
  }

  return "Der er brug for ekstra bemanding. Kan du hjælpe?";
}
