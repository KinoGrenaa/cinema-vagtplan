import type { CurrentUser, MonthPlanDay, ScheduleTemplateSummary, ScheduleTemplateWeekParity } from "./shiftPlanningTypes";

const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";

export function getCurrentUserFromToken(): CurrentUser | null {
  const token = localStorage.getItem("token");

  if (!token) return null;

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

export function formatDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-");
  return `${day}.${month}.${year}`;
}

export function getMonthName(year: number, month: number) {
  return new Intl.DateTimeFormat("da-DK", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function getWeekdayName(dateKey: string, length: "short" | "long" = "short") {
  return new Intl.DateTimeFormat("da-DK", { weekday: length }).format(
    new Date(`${dateKey}T00:00:00.000Z`),
  );
}

export function getCalendarLeadingBlankCount(year: number, month: number) {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const jsDay = firstDay.getUTCDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function addMonths(year: number, month: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
  };
}

export function formatWeekParity(value: ScheduleTemplateWeekParity) {
  if (value === "EVEN") return "Lige uger";
  if (value === "ODD") return "Ulige uger";
  return "Alle uger";
}

export function formatTemplateLabel(template: ScheduleTemplateSummary | null) {
  if (!template) {
    return "Ingen skabelon";
  }

  return `${template.name} · ${formatWeekParity(template.weekParity)}`;
}

export function getDayStatusLabel(day: MonthPlanDay) {
  if (!day.isActive) return "Inaktiv";
  if (day.scheduleTemplateId) return "Planlagt";
  return "Mangler skabelon";
}

export function getDayStatusClasses(day: MonthPlanDay) {
  if (!day.isActive) {
    return "border-gray-300 bg-gray-100 text-gray-600 dark:border-gray-800 dark:bg-gray-950/60 dark:text-gray-400";
  }

  if (day.scheduleTemplateId) {
    return "border-green-200 bg-green-50 text-green-800 dark:border-green-900/70 dark:bg-green-950/30 dark:text-green-200";
  }

  return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200";
}

export function getMonthSummary(days: MonthPlanDay[]) {
  const activeDays = days.filter((day) => day.isActive).length;
  const inactiveDays = days.length - activeDays;
  const daysWithTemplate = days.filter(
    (day) => day.isActive && Boolean(day.scheduleTemplateId),
  ).length;
  const missingTemplateDays = days.filter(
    (day) => day.isActive && !day.scheduleTemplateId,
  ).length;
  const totalUnassigned = days.reduce(
    (sum, day) => sum + (day.unassignedShiftCount ?? 0),
    0,
  );

  return {
    activeDays,
    inactiveDays,
    daysWithTemplate,
    missingTemplateDays,
    totalUnassigned,
  };
}

export function isToday(dateKey: string) {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return dateKey === todayKey;
}
