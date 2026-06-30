import type {
  CurrentUser,
  MonthPlanDay,
  ScheduleTemplateDaySummary,
  ScheduleTemplateSummary,
  ScheduleTemplateUserSummary,
  ScheduleTemplateWeekParity,
} from "./shiftPlanningTypes";

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

function isValidDateParts(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function normalizeDateKey(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  const dateKeyMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dateKeyMatch) {
    const [, yearText, monthText, dayText] = dateKeyMatch;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);

    if (isValidDateParts(year, month, day)) {
      return `${yearText}-${monthText}-${dayText}`;
    }
  }

  const parsedDate = new Date(trimmedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const year = parsedDate.getUTCFullYear();
  const month = String(parsedDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getMonthPlanDayDateKey(day: {
  date?: string | null;
  dateKey?: string | null;
}) {
  return normalizeDateKey(day.dateKey) ?? normalizeDateKey(day.date) ?? "";
}

function getUtcDateFromDateKey(value: string | null | undefined) {
  const dateKey = normalizeDateKey(value);

  if (!dateKey) {
    return null;
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDateKey(dateKey: string | null | undefined) {
  const normalizedDateKey = normalizeDateKey(dateKey);

  if (!normalizedDateKey) {
    return "Ukendt dato";
  }

  const [year, month, day] = normalizedDateKey.split("-");
  return `${day}.${month}.${year}`;
}

export function getMonthName(year: number, month: number) {
  return new Intl.DateTimeFormat("da-DK", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function getWeekdayName(
  dateKey: string | null | undefined,
  length: "short" | "long" = "short",
) {
  const date = getUtcDateFromDateKey(dateKey);

  if (!date) {
    return length === "long" ? "Ukendt dag" : "Ukendt";
  }

  return new Intl.DateTimeFormat("da-DK", { weekday: length }).format(date);
}

export function getIsoWeekday(dateKey: string | null | undefined) {
  const date = getUtcDateFromDateKey(dateKey);

  if (!date) {
    return null;
  }

  const jsDay = date.getUTCDay();
  return jsDay === 0 ? 7 : jsDay;
}

export function getIsoWeekNumber(dateKey: string | null | undefined) {
  const date = getUtcDateFromDateKey(dateKey);

  if (!date) {
    return null;
  }

  const thursdayDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const isoWeekday = thursdayDate.getUTCDay() || 7;
  thursdayDate.setUTCDate(thursdayDate.getUTCDate() + 4 - isoWeekday);

  const yearStart = new Date(Date.UTC(thursdayDate.getUTCFullYear(), 0, 1));
  const daysSinceYearStart =
    (thursdayDate.getTime() - yearStart.getTime()) / 86400000 + 1;

  return Math.ceil(daysSinceYearStart / 7);
}

export function getDateWeekParity(
  dateKey: string | null | undefined,
): Exclude<ScheduleTemplateWeekParity, "ANY"> | null {
  const weekNumber = getIsoWeekNumber(dateKey);

  if (!weekNumber) {
    return null;
  }

  return weekNumber % 2 === 0 ? "EVEN" : "ODD";
}

export function getDateWeekParityLabel(dateKey: string | null | undefined) {
  const weekNumber = getIsoWeekNumber(dateKey);
  const weekParity = getDateWeekParity(dateKey);

  if (!weekNumber || !weekParity) {
    return "Ukendt uge";
  }

  return `Uge ${weekNumber} · ${weekParity === "EVEN" ? "lige uge" : "ulige uge"}`;
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

export function isTemplateWeekParityCompatible(
  template: ScheduleTemplateSummary | null,
  dateKey: string | null | undefined,
) {
  if (!template || template.weekParity === "ANY") {
    return true;
  }

  const dateWeekParity = getDateWeekParity(dateKey);

  if (!dateWeekParity) {
    return true;
  }

  return template.weekParity === dateWeekParity;
}

export function getTemplateWeekParityWarning(
  template: ScheduleTemplateSummary | null,
  dateKey: string | null | undefined,
) {
  if (!template || isTemplateWeekParityCompatible(template, dateKey)) {
    return null;
  }

  return `${template.name} er markeret til ${formatWeekParity(
    template.weekParity,
  ).toLowerCase()}, men datoen ligger i ${getDateWeekParityLabel(
    dateKey,
  ).toLowerCase()}. Brug kun valget som bevidst afvigelse.`;
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

export function getTemplateDayForDate(
  template: ScheduleTemplateSummary | null,
  dateKey: string | null | undefined,
) {
  if (!template?.days?.length) {
    return null;
  }

  const weekday = getIsoWeekday(dateKey);

  if (!weekday) {
    return null;
  }

  return template.days.find((day) => day.weekday === weekday && day.isActive) ?? null;
}

export function getTemplateDayRequiredCount(
  templateDay: ScheduleTemplateDaySummary | null,
) {
  return (templateDay?.jobFunctions ?? []).reduce(
    (sum, item) => sum + (item.requiredCount ?? 0),
    0,
  );
}

export function getTemplateDayAssignedCount(
  templateDay: ScheduleTemplateDaySummary | null,
) {
  return (templateDay?.jobFunctions ?? []).reduce(
    (sum, item) => sum + (item.assignments?.length ?? 0),
    0,
  );
}

export function getUserDisplayName(user: ScheduleTemplateUserSummary) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.email;
}

export function isToday(dateKey: string | null | undefined) {
  const normalizedDateKey = normalizeDateKey(dateKey);

  if (!normalizedDateKey) {
    return false;
  }

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return normalizedDateKey === todayKey;
}
