type DayPeriod = {
  id: number;
  name: string;
  startMinute: number;
  endMinute: number;
  isActive: boolean;
};

type JobFunction = {
  id: number;
  name: string;
  description: string | null;
  color: string;
  isActive: boolean;
  dayPeriod?: DayPeriod | null;
};

type ScheduleTemplateUser = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role?: "MASTER" | "ADMIN" | "EMPLOYEE";
  isActive?: boolean;
};

type ScheduleTemplateAssignment = {
  id: number;
  userId?: number | null;
  sortOrder?: number | null;
  user?: ScheduleTemplateUser | null;
};

type TemplateJobFunction = {
  id: number;
  jobFunctionId: number;
  requiredCount: number;
  sortOrder: number;
  note: string | null;
  jobFunction: JobFunction;
  assignments?: ScheduleTemplateAssignment[];
};

type TemplateJobFunctionUpdates = Partial<
  Pick<TemplateJobFunction, "requiredCount" | "sortOrder" | "note">
>;

function minuteToTime(value: number) {
  const safeValue = Number.isFinite(value)
    ? Math.min(Math.max(Math.trunc(value), 0), 1439)
    : 0;
  const hours = Math.floor(safeValue / 60);
  const minutes = safeValue % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatDayPeriod(dayPeriod: DayPeriod | null | undefined) {
  if (!dayPeriod) return "Ingen dagsperiode";

  return `${dayPeriod.name} · kl. ${minuteToTime(dayPeriod.startMinute)}-${minuteToTime(dayPeriod.endMinute)}`;
}

function formatUserName(user: ScheduleTemplateUser | null | undefined) {
  if (!user) return "Ukendt medarbejder";

  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return name || user.email;
}

function getAssignmentUserId(assignment: ScheduleTemplateAssignment) {
  const userId = Number(assignment.userId ?? assignment.user?.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  return userId;
}

function getAssignedUserIdSet(item: TemplateJobFunction) {
  return new Set(
    (item.assignments ?? [])
      .map(getAssignmentUserId)
      .filter((userId): userId is number => userId !== null),
  );
}

function parseOptionalPositiveInteger(value: string, fallback: number) {
  const trimmed = value.trim();

  if (trimmed === "") {
    return fallback;
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function formatOpenShiftText(openShiftCount: number) {
  return openShiftCount === 1
    ? "1 åben vagt"
    : `${openShiftCount} åbne vagter`;
}

export {
  formatDayPeriod,
  formatOpenShiftText,
  formatUserName,
  getAssignedUserIdSet,
  parseOptionalPositiveInteger,
};

export type {
  ScheduleTemplateAssignment,
  ScheduleTemplateUser,
  TemplateJobFunction,
  TemplateJobFunctionUpdates,
};
