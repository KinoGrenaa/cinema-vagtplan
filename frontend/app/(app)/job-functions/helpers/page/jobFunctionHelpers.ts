import type {
  CurrentUser,
  JobFunction,
  JobFunctionTimingAnchor,
  JobFunctionTimingRule,
  User,
} from "../types/jobFunctionTypes";

const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";

export function getCurrentUserFromToken(): CurrentUser | null {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try { return JSON.parse(atob(token.split(".")[1])); } catch { return null; }
}

export function getSelectedMasterCinemaId() {
  const value = Number(localStorage.getItem(MASTER_SELECTED_CINEMA_ID_KEY));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function appendCinemaId(path: string, cinemaId: number | null) {
  if (!cinemaId) return path;
  return `${path}${path.includes("?") ? "&" : "?"}cinemaId=${cinemaId}`;
}

export async function readErrorMessage(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);
  if (typeof data?.message === "string") return data.message;
  if (Array.isArray(data?.message)) return data.message.join("\n");
  return fallback;
}

export function minuteToTime(value: number) {
  const normalized = ((Math.trunc(value) % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

export function formatMinute(value: number) { return `kl. ${minuteToTime(value)}`; }

export function formatFilmWindow(rule: JobFunctionTimingRule | null | undefined) {
  if (!rule) return "Ikke konfigureret";
  if (rule.restrictMovieStartsToWindow === false) return "Alle filmstarter";
  const nextDay = rule.filmWindowEndMinute >= 1440 ? " næste dag" : "";
  return `Filmstarter fra ${formatMinute(rule.filmWindowStartMinute)} og før ${formatMinute(rule.filmWindowEndMinute)}${nextDay}`;
}

export function getJobFunctionEmployeeCount(jobFunction: JobFunction) {
  return jobFunction._count?.userJobFunctions ?? 0;
}

export function normalizeColorValue(value: string) { return value.trim() || "#2563eb"; }

export function formatUserName(user: Pick<User, "firstName" | "lastName" | "email">) {
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
}

export function isAssignableUser(user: User) {
  return user.role !== "MASTER" && user.isActive !== false;
}

export function timeToMinute(value: string, fieldName: string) {
  const normalized = value.trim();
  if (!/^\d{2}:\d{2}$/.test(normalized)) {
    throw new Error(`${fieldName} skal angives som TT:MM.`);
  }
  const [hours, minutes] = normalized.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`${fieldName} skal være mellem 00:00 og 23:59.`);
  }
  return hours * 60 + minutes;
}

export function optionalTimeToMinute(value: string, fieldName: string) {
  return value.trim() ? timeToMinute(value, fieldName) : null;
}

export function formatTimingAnchor(anchor: JobFunctionTimingAnchor) {
  switch (anchor) {
    case "FIRST_MOVIE_START": return "Første filmstart";
    case "FIRST_MOVIE_END": return "Første filmslut";
    case "LAST_MOVIE_START": return "Sidste filmstart";
    case "LAST_MOVIE_END": return "Sidste filmslut";
    case "FIXED_TIME": return "Fast tidspunkt";
  }
}

export function formatTimingOffset(value: number) {
  if (!Number.isFinite(value) || value === 0) return "ingen forskydning";
  return value < 0 ? `${Math.abs(value)} min før` : `${value} min efter`;
}

export function formatTimingRuleSummary(rule: JobFunctionTimingRule | null | undefined) {
  if (!rule) return "Ingen tidsregel";
  if (!rule.isActive) return "Tidsregel arkiveret";
  const start = rule.startAnchor === "FIXED_TIME" && rule.startFixedMinute !== null
    ? formatMinute(rule.startFixedMinute)
    : `${formatTimingAnchor(rule.startAnchor)} · ${formatTimingOffset(rule.startOffsetMinutes)}`;
  const end = rule.endAnchor === "FIXED_TIME" && rule.endFixedMinute !== null
    ? formatMinute(rule.endFixedMinute)
    : `${formatTimingAnchor(rule.endAnchor)} · ${formatTimingOffset(rule.endOffsetMinutes)}`;
  const startRounding =
    (rule.roundStartToNearestQuarter ?? rule.roundToQuarter)
      ? "mødetid til nærmeste kvarter"
      : "ingen afrunding af mødetid";
  const endRounding =
    (rule.roundEndToNearestQuarter ?? rule.roundToQuarter)
      ? "fyraften til nærmeste kvarter"
      : "ingen afrunding af fyraften";
  return `Start: ${start} · Slut: ${end} · ${startRounding} · ${endRounding}`;
}
