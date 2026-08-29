type JobFunction = {
  id: number;
  name: string;
  description: string | null;
  color: string;
  isActive: boolean;
  timingRule?: {
    filmWindowStartMinute: number;
    filmWindowEndMinute: number;
    startAnchor?: string;
    startOffsetMinutes?: number;
    startFixedMinute?: number | null;
    endAnchor?: string;
    endOffsetMinutes?: number;
    endFixedMinute?: number | null;
    roundToQuarter?: boolean;
    roundStartToNearestQuarter: boolean;
    roundEndToNearestQuarter: boolean;
    restrictMovieStartsToWindow: boolean;
    isActive: boolean;
  } | null;
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

function formatFilmWindow(jobFunction: JobFunction) {
  const rule = jobFunction.timingRule;
  if (!rule?.isActive) return "Ingen aktiv tidsregel";
  if (!rule.restrictMovieStartsToWindow) return null;

  const nextDay =
    rule.filmWindowEndMinute >= 1440
      ? " næste dag"
      : "";

  return `Forestillinger ${minuteToTime(
    rule.filmWindowStartMinute,
  )}–${minuteToTime(
    rule.filmWindowEndMinute,
  )}${nextDay}`;
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

type SameDayAssignmentNotice = {
  jobFunctionId: number;
  jobFunctionName: string;
  potentialOverlap: boolean;
};

function getFixedRuleBoundaryMinute(
  jobFunction: JobFunction,
  boundary: "start" | "end",
) {
  const rule = jobFunction.timingRule;
  if (!rule?.isActive) return null;

  const anchor =
    boundary === "start"
      ? rule.startAnchor
      : rule.endAnchor;
  const fixedMinute =
    boundary === "start"
      ? rule.startFixedMinute
      : rule.endFixedMinute;
  const offset =
    boundary === "start"
      ? rule.startOffsetMinutes
      : rule.endOffsetMinutes;

  if (
    anchor !== "FIXED_TIME" ||
    !Number.isFinite(fixedMinute) ||
    (offset ?? 0) !== 0
  ) {
    return null;
  }

  return Number(fixedMinute);
}

function mayTemplateJobFunctionsOverlap(
  left: TemplateJobFunction,
  right: TemplateJobFunction,
) {
  const leftStart =
    getFixedRuleBoundaryMinute(
      left.jobFunction,
      "start",
    );
  const leftEnd =
    getFixedRuleBoundaryMinute(
      left.jobFunction,
      "end",
    );
  const rightStart =
    getFixedRuleBoundaryMinute(
      right.jobFunction,
      "start",
    );
  const rightEnd =
    getFixedRuleBoundaryMinute(
      right.jobFunction,
      "end",
    );

  if (
    leftEnd !== null &&
    rightStart !== null &&
    leftEnd <= rightStart
  ) {
    return false;
  }

  if (
    rightEnd !== null &&
    leftStart !== null &&
    rightEnd <= leftStart
  ) {
    return false;
  }

  return true;
}

function getSameDayAssignmentNotices(
  item: TemplateJobFunction,
  sameDayJobFunctions: TemplateJobFunction[],
  userId: number,
): SameDayAssignmentNotice[] {
  return sameDayJobFunctions
    .filter(
      (otherItem) =>
        otherItem.id !== item.id &&
        (otherItem.assignments ?? []).some(
          (assignment) =>
            getAssignmentUserId(
              assignment,
            ) === userId,
        ),
    )
    .map((otherItem) => ({
      jobFunctionId:
        otherItem.jobFunctionId,
      jobFunctionName:
        otherItem.jobFunction.name,
      potentialOverlap:
        mayTemplateJobFunctionsOverlap(
          item,
          otherItem,
        ),
    }));
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
  formatFilmWindow,
  formatOpenShiftText,
  formatUserName,
  getAssignedUserIdSet,
  getAssignmentUserId,
  getSameDayAssignmentNotices,
  mayTemplateJobFunctionsOverlap,
  parseOptionalPositiveInteger,
};

export type {
  SameDayAssignmentNotice,
  ScheduleTemplateAssignment,
  ScheduleTemplateUser,
  TemplateJobFunction,
  TemplateJobFunctionUpdates,
};
