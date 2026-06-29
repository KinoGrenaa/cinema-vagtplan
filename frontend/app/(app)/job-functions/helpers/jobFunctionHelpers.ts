import type { CurrentUser, DayPeriod, JobFunction, User } from "./jobFunctionTypes";

const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";

export function getCurrentUserFromToken(): CurrentUser | null {
  const token = localStorage.getItem("token");
  if (!token) {
    return null;
  }

  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch {
    return null;
  }
}

export function getSelectedMasterCinemaId() {
  const selectedCinemaId = Number(
    localStorage.getItem(MASTER_SELECTED_CINEMA_ID_KEY),
  );

  if (!Number.isFinite(selectedCinemaId) || selectedCinemaId <= 0) {
    return null;
  }

  return selectedCinemaId;
}

export function appendCinemaId(path: string, cinemaId: number | null) {
  if (!cinemaId) {
    return path;
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}cinemaId=${cinemaId}`;
}

export async function readErrorMessage(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);

  if (typeof data?.message === "string") {
    return data.message;
  }

  if (Array.isArray(data?.message)) {
    return data.message.join("\n");
  }

  return fallback;
}

export function minuteToTime(value: number) {
  const safeValue = Number.isFinite(value)
    ? Math.min(Math.max(Math.trunc(value), 0), 1439)
    : 0;
  const hours = Math.floor(safeValue / 60);
  const minutes = safeValue % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0",
  )}`;
}

export function formatMinute(value: number) {
  return `kl. ${minuteToTime(value)}`;
}

export function formatDayPeriod(dayPeriod: DayPeriod | null | undefined) {
  if (!dayPeriod) {
    return "Ingen dagsperiode";
  }

  return `${dayPeriod.name} · ${formatMinute(dayPeriod.startMinute)} - ${formatMinute(
    dayPeriod.endMinute,
  )}`;
}

export function getJobFunctionEmployeeCount(jobFunction: JobFunction) {
  return jobFunction._count?.userJobFunctions ?? 0;
}

export function normalizeColorValue(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return "#2563eb";
  }

  return normalized;
}

export function formatUserName(user: Pick<User, "firstName" | "lastName" | "email">) {
  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return fullName || user.email;
}

export function isAssignableUser(user: User) {
  return user.role !== "MASTER" && user.isActive !== false;
}
