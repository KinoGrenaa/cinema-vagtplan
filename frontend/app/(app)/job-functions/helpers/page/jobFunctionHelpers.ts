import type {
  CurrentUser,
  DayPeriod,
  JobFunction,
  JobFunctionTimingAnchor,
  JobFunctionTimingRule,
  User,
} from "../types/jobFunctionTypes";

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

export function formatUserName(
  user: Pick<User, "firstName" | "lastName" | "email">,
) {
  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return fullName || user.email;
}

export function isAssignableUser(user: User) {
  return user.role !== "MASTER" && user.isActive !== false;
}

export function timeToMinute(value: string, fieldName: string) {
  const normalized = value.trim();

  if (!/^\d{2}:\d{2}$/.test(normalized)) {
    throw new Error(`${fieldName} skal angives som TT:MM.`);
  }

  const [hoursText, minutesText] = normalized.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error(`${fieldName} skal være mellem 00:00 og 23:59.`);
  }

  return hours * 60 + minutes;
}

export function optionalTimeToMinute(value: string, fieldName: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return timeToMinute(normalized, fieldName);
}

export function formatTimingAnchor(anchor: JobFunctionTimingAnchor) {
  switch (anchor) {
    case "DAY_PERIOD_START":
      return "Dagsperiode start";
    case "DAY_PERIOD_END":
      return "Dagsperiode slut";
    case "FIRST_MOVIE_START":
      return "Første filmstart";
    case "LAST_MOVIE_END":
      return "Sidste filmslut";
    case "FIXED_TIME":
      return "Fast tidspunkt";
    default:
      return "Ukendt regel";
  }
}

export function formatTimingOffset(value: number) {
  if (!Number.isFinite(value) || value === 0) {
    return "ingen forskydning";
  }

  const absoluteValue = Math.abs(value);
  return value < 0 ? `${absoluteValue} min før` : `${absoluteValue} min efter`;
}

export function formatTimingRuleSummary(
  rule: JobFunctionTimingRule | null | undefined,
) {
  if (!rule) {
    return "Ingen tidsregel";
  }

  if (!rule.isActive) {
    return "Tidsregel arkiveret";
  }

  const start =
    rule.startAnchor === "FIXED_TIME" && rule.startFixedMinute !== null
      ? formatMinute(rule.startFixedMinute)
      : `${formatTimingAnchor(rule.startAnchor)} · ${formatTimingOffset(
          rule.startOffsetMinutes,
        )}`;
  const end =
    rule.endAnchor === "FIXED_TIME" && rule.endFixedMinute !== null
      ? formatMinute(rule.endFixedMinute)
      : `${formatTimingAnchor(rule.endAnchor)} · ${formatTimingOffset(
          rule.endOffsetMinutes,
        )}`;
  const fallback =
    rule.fallbackStartMinute !== null && rule.fallbackEndMinute !== null
      ? `Uden filmprogram ${formatMinute(rule.fallbackStartMinute)} - ${formatMinute(
          rule.fallbackEndMinute,
        )}`
      : "Ingen tider uden filmprogram";

  return `Start: ${start} · Slut: ${end} · ${fallback}`;
}
