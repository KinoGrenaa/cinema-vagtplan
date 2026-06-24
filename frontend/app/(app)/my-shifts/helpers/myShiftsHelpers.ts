import { formatDateDK, formatTimeDK } from "@/app/utils/dateTime";
import type { CurrentUser } from "./myShiftsTypes";

export async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();

    if (Array.isArray(data.message)) {
      return data.message.join("\n");
    }

    return data.message || fallback;
  } catch {
    return fallback;
  }
}

export function getStoredUser() {
  const savedUser = window.localStorage.getItem("user");

  if (!savedUser) {
    return null;
  }

  try {
    const parsedUser = JSON.parse(savedUser) as CurrentUser;

    if (!parsedUser || typeof parsedUser !== "object") {
      return null;
    }

    return parsedUser;
  } catch {
    return null;
  }
}

export function hasOwnCinema(user: CurrentUser | null) {
  return Boolean(user?.cinemaId && Number(user.cinemaId) > 0);
}

export function formatShiftDate(value: string) {
  return formatDateDK(value);
}

export function formatShiftTimeRange(shift: { startTime: string; endTime: string }) {
  return `${formatTimeDK(shift.startTime)} - ${formatTimeDK(shift.endTime)}`;
}

export function getShiftWorkTypeName(shift: {
  workType?: {
    name: string;
  };
}) {
  return shift.workType?.name ?? "Ukendt arbejdstype";
}

export function getShiftConfirmText(shift: {
  startTime: string;
  endTime: string;
  workType?: {
    name: string;
  };
}) {
  return `${getShiftWorkTypeName(shift)}
${formatShiftDate(shift.startTime)}
${formatShiftTimeRange(shift)}`;
}
