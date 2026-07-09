import type {
  ScheduleTemplateAssignment,
  ScheduleTemplateCopySource,
  TemplateCopyDaySummary,
  TemplateDay,
  TemplateStaffingSummary,
} from "./scheduleTemplateCopyTypes";

function getAssignmentUserId(assignment: ScheduleTemplateAssignment) {
  const userId = Number(assignment.userId ?? assignment.user?.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  return userId;
}

function countAssignedTemplateUsers(
  assignments: ScheduleTemplateAssignment[] | undefined,
) {
  return (assignments ?? []).filter(
    (assignment) => getAssignmentUserId(assignment) !== null,
  ).length;
}

function sortTemplateDays(days: TemplateDay[]) {
  return [...days].sort((a, b) => a.weekday - b.weekday);
}

export function getTemplateDaysForCopy(
  template: ScheduleTemplateCopySource | null,
  includeInactiveDays: boolean,
) {
  const days = sortTemplateDays(template?.days ?? []);

  if (includeInactiveDays) {
    return days;
  }

  return days.filter((day) => day.isActive);
}

function summarizeTemplateCopyDay(day: TemplateDay): TemplateCopyDaySummary {
  const shiftCount = day.jobFunctions.reduce(
    (sum, item) => sum + item.requiredCount,
    0,
  );
  const assignedShiftCount = day.jobFunctions.reduce(
    (sum, item) => sum + countAssignedTemplateUsers(item.assignments),
    0,
  );

  return {
    weekday: day.weekday,
    isActive: day.isActive,
    jobFunctionCount: day.jobFunctions.length,
    shiftCount,
    assignedShiftCount,
    openShiftCount: Math.max(shiftCount - assignedShiftCount, 0),
  };
}

export function summarizeTemplateStaffing(
  template: ScheduleTemplateCopySource | null,
  options: { includeInactiveDays?: boolean } = {},
): TemplateStaffingSummary {
  const includeInactiveDays = options.includeInactiveDays ?? true;

  return getTemplateDaysForCopy(template, includeInactiveDays).reduce<TemplateStaffingSummary>(
    (summary, day) => {
      const daySummary = summarizeTemplateCopyDay(day);

      return {
        dayCount: summary.dayCount + 1,
        jobFunctionCount: summary.jobFunctionCount + daySummary.jobFunctionCount,
        shiftCount: summary.shiftCount + daySummary.shiftCount,
        assignedShiftCount:
          summary.assignedShiftCount + daySummary.assignedShiftCount,
        openShiftCount: summary.openShiftCount + daySummary.openShiftCount,
      };
    },
    {
      dayCount: 0,
      jobFunctionCount: 0,
      shiftCount: 0,
      assignedShiftCount: 0,
      openShiftCount: 0,
    },
  );
}

export function summarizeTemplateCopyDays(
  template: ScheduleTemplateCopySource | null,
  options: { includeInactiveDays?: boolean } = {},
): TemplateCopyDaySummary[] {
  const includeInactiveDays = options.includeInactiveDays ?? true;

  return getTemplateDaysForCopy(template, includeInactiveDays).map(
    summarizeTemplateCopyDay,
  );
}
