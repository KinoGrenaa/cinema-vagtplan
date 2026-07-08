import type {
  CurrentUser,
  ScheduleTemplate,
  ScheduleTemplateAssignment,
} from "./scheduleTemplatePageTypes";

const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";

export const weekdayOptions = [
  { value: 1, shortLabel: "Man", label: "Mandag" },
  { value: 2, shortLabel: "Tir", label: "Tirsdag" },
  { value: 3, shortLabel: "Ons", label: "Onsdag" },
  { value: 4, shortLabel: "Tor", label: "Torsdag" },
  { value: 5, shortLabel: "Fre", label: "Fredag" },
  { value: 6, shortLabel: "Lør", label: "Lørdag" },
  { value: 7, shortLabel: "Søn", label: "Søndag" },
];

export function getCurrentUserFromToken(): CurrentUser | null {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload)) as CurrentUser;
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
  if (!cinemaId) return path;

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}cinemaId=${cinemaId}`;
}

export async function readErrorMessage(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);

  if (typeof data?.message === "string") return data.message;
  if (Array.isArray(data?.message)) return data.message.join("\n");

  return fallback;
}

export function formatWeekday(value: number) {
  return (
    weekdayOptions.find((weekday) => weekday.value === value)?.label ??
    "Ukendt dag"
  );
}

export function getAssignmentUserId(assignment: ScheduleTemplateAssignment) {
  const userId = Number(assignment.userId ?? assignment.user?.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  return userId;
}

export function getTemplateDay(template: ScheduleTemplate | null, weekday: number) {
  return template?.days?.find((day) => day.weekday === weekday) ?? null;
}

export function getCopyTargetWeekdays(selectedWeekday: number, weekdays: number[]) {
  return weekdays
    .filter((weekday) => weekday !== selectedWeekday)
    .sort((a, b) => a - b);
}
