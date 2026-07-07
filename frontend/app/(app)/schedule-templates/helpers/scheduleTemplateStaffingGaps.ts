export type ScheduleTemplateStaffingAssignment = {
  userId?: number | null;
  user?: {
    id?: number | null;
  } | null;
};

export type ScheduleTemplateStaffingJobFunction = {
  id: number;
  requiredCount: number;
  jobFunction?: {
    name?: string | null;
  } | null;
  assignments?: ScheduleTemplateStaffingAssignment[] | null;
};

export type ScheduleTemplateStaffingDay = {
  weekday: number;
  isActive?: boolean;
  jobFunctions?: ScheduleTemplateStaffingJobFunction[] | null;
};

export type ScheduleTemplateStaffingTemplate = {
  days?: ScheduleTemplateStaffingDay[] | null;
};

export type ScheduleTemplateStaffingGap = {
  weekday: number;
  jobFunctionId: number;
  jobFunctionName: string;
  requiredCount: number;
  assignedCount: number;
  missingCount: number;
};

export type ScheduleTemplateStaffingGapSummary = {
  jobFunctionCount: number;
  missingShiftCount: number;
};

function getAssignmentUserId(assignment: ScheduleTemplateStaffingAssignment) {
  const userId = Number(assignment.userId ?? assignment.user?.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  return userId;
}

export function countAssignedTemplateUsers(
  assignments: ScheduleTemplateStaffingAssignment[] | null | undefined,
) {
  return new Set(
    (assignments ?? [])
      .map(getAssignmentUserId)
      .filter((userId): userId is number => userId !== null),
  ).size;
}

export function getJobFunctionStaffingGap(
  item: ScheduleTemplateStaffingJobFunction,
) {
  const requiredCount = Number.isInteger(item.requiredCount)
    ? Math.max(item.requiredCount, 0)
    : 0;
  const assignedCount = countAssignedTemplateUsers(item.assignments);

  return Math.max(requiredCount - assignedCount, 0);
}

export function getDayStaffingGaps(day: ScheduleTemplateStaffingDay | null) {
  if (!day?.isActive) return [];

  return (day.jobFunctions ?? []).flatMap((item) => {
    const assignedCount = countAssignedTemplateUsers(item.assignments);
    const missingCount = getJobFunctionStaffingGap(item);

    if (missingCount <= 0) return [];

    return [
      {
        weekday: day.weekday,
        jobFunctionId: item.id,
        jobFunctionName: item.jobFunction?.name?.trim() || "Ukendt jobfunktion",
        requiredCount: item.requiredCount,
        assignedCount,
        missingCount,
      },
    ];
  });
}

export function getTemplateStaffingGaps(
  template: ScheduleTemplateStaffingTemplate | null,
) {
  return (template?.days ?? []).flatMap((day) => getDayStaffingGaps(day));
}

export function summarizeStaffingGaps(
  gaps: ScheduleTemplateStaffingGap[],
): ScheduleTemplateStaffingGapSummary {
  return {
    jobFunctionCount: gaps.length,
    missingShiftCount: gaps.reduce((sum, gap) => sum + gap.missingCount, 0),
  };
}

export type ScheduleTemplateStaffingDaySummary = {
  jobFunctionCount: number;
  shiftCount: number;
  assignedShiftCount: number;
  openShiftCount: number;
};

export function summarizeTemplateDayStaffing(
  day: ScheduleTemplateStaffingDay | null,
): ScheduleTemplateStaffingDaySummary {
  return (day?.jobFunctions ?? []).reduce(
    (summary, item) => {
      const requiredCount = Number.isInteger(item.requiredCount)
        ? Math.max(item.requiredCount, 0)
        : 0;
      const assignedShiftCount = Math.min(
        countAssignedTemplateUsers(item.assignments),
        requiredCount,
      );

      return {
        jobFunctionCount: summary.jobFunctionCount + 1,
        shiftCount: summary.shiftCount + requiredCount,
        assignedShiftCount: summary.assignedShiftCount + assignedShiftCount,
        openShiftCount:
          summary.openShiftCount +
          Math.max(requiredCount - assignedShiftCount, 0),
      };
    },
    {
      jobFunctionCount: 0,
      shiftCount: 0,
      assignedShiftCount: 0,
      openShiftCount: 0,
    },
  );
}

export function getTemplateStaffingGapSummary(
  template: ScheduleTemplateStaffingTemplate | null,
) {
  return summarizeStaffingGaps(getTemplateStaffingGaps(template));
}
