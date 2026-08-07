export type CurrentUser = {
  sub: number;
  email: string;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  cinemaId: number | null;
};

export type ScheduleTemplateWeekParity = "ANY" | "EVEN" | "ODD";

export type ScheduleTemplateUserSummary = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  isActive: boolean;
  cinemaId: number | null;
};



export type ScheduleTemplateTimingRuleSummary = {
  id: number;
  cinemaId: number;
  jobFunctionId: number;
  filmWindowStartMinute: number;
  filmWindowEndMinute: number;
  startAnchor: string;
  startOffsetMinutes: number;
  startFixedMinute: number | null;
  endAnchor: string;
  endOffsetMinutes: number;
  endFixedMinute: number | null;
  fallbackStartMinute: number;
  fallbackEndMinute: number;
  roundToQuarter?: boolean;
  roundStartToNearestQuarter: boolean;
  roundEndToNearestQuarter: boolean;
  restrictMovieStartsToWindow: boolean;
  isActive: boolean;
};

export type ScheduleTemplateJobFunctionDetail = {
  id: number;
  cinemaId: number;
  name: string;
  description: string | null;
  color: string;
  sortOrder: number;
  timingRule: ScheduleTemplateTimingRuleSummary | null;
  isActive: boolean;
  archivedAt: string | null;
  _count?: {
    userJobFunctions?: number;
  };
};

export type ScheduleTemplateAssignmentSummary = {
  id: number;
  cinemaId: number;
  templateJobFunctionId: number;
  userId: number;
  sortOrder: number;
  createdAt: string;
  user: ScheduleTemplateUserSummary;
};

export type ScheduleTemplateJobFunctionSummary = {
  id: number;
  cinemaId: number;
  templateDayId: number;
  jobFunctionId: number;
  requiredCount: number;
  sortOrder: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  jobFunction: ScheduleTemplateJobFunctionDetail;
  assignments: ScheduleTemplateAssignmentSummary[];
};

export type ScheduleTemplateDaySummary = {
  id: number;
  cinemaId: number;
  templateId: number;
  weekday: number;
  isActive: boolean;
  note: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  jobFunctions: ScheduleTemplateJobFunctionSummary[];
};

export type ScheduleTemplateSummary = {
  id: number;
  cinemaId: number;
  name: string;
  description: string | null;
  weekParity: ScheduleTemplateWeekParity;
  startsOn: string | null;
  sortOrder: number;
  isActive: boolean;
  archivedAt: string | null;
  days?: ScheduleTemplateDaySummary[];
  _count?: {
    days?: number;
  };
};

export type ShiftMonthOverviewUser = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  profileImage: string | null;
};
export type ShiftMonthOverviewJobFunction = {
  id: number;
  name: string;
  color: string;
  isActive: boolean;
};
export type ShiftMonthOverviewShift = {
  id: number;
  startTime: string;
  endTime: string;
  note: string | null;
  userId: number | null;
  jobFunctionId: number | null;
  jobFunctionNameSnapshot: string | null;
  jobFunctionColorSnapshot: string | null;
  timingSource: string;
  user: ShiftMonthOverviewUser | null;
  jobFunction: ShiftMonthOverviewJobFunction | null;
};
export type ShiftMonthOverviewDay = {
  dateKey: string;
  shiftCount: number;
  assignedShiftCount: number;
  unassignedShiftCount: number;
  shifts: ShiftMonthOverviewShift[];
};
export type ShiftMonthOverviewResponse = {
  cinemaId: number;
  year: number;
  month: number;
  startDate: string;
  endDateExclusive: string;
  totalShiftCount: number;
  days: ShiftMonthOverviewDay[];
};

export type MonthPlanDay = {
  id: number | null;
  cinemaId: number;
  date: string;
  dateKey: string;
  isPersisted: boolean;
  isActive: boolean;
  scheduleTemplateId: number | null;
  scheduleTemplate: ScheduleTemplateSummary | null;
  note: string | null;
  movieProgramFirstStart: string | null;
  movieProgramLastEnd: string | null;
  movieShowingCount: number;
  plannedShiftCount: number;
  unassignedShiftCount: number;
  scheduledShifts?: ShiftMonthOverviewShift[];
  scheduledShiftCount?: number;
  scheduledAssignedShiftCount?: number;
  scheduledUnassignedShiftCount?: number;
  workingPreviewItems?: ShiftPlanningWorkingPreviewItem[];
  createdAt: string | null;
  updatedAt: string | null;
};

export type MonthPlanResponse = {
  cinemaId: number;
  year: number;
  month: number;
  startDate: string;
  endDateExclusive: string;
  days: MonthPlanDay[];
};

export type ShiftPlanningWorkingPreviewItem = {
  previewItemId: string;
  dateKey: string;
  monthPlanDayId: number | null;
  scheduleTemplateId: number | null;
  scheduleTemplateDayId: number | null;
  templateJobFunctionId: number | null;
  jobFunctionId: number | null;
  jobFunctionName: string | null;
  jobFunctionColor: string | null;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  requiredIndex: number;
  plannedStartMinute: number | null;
  plannedEndMinute: number | null;
  startTime: string | null;
  endTime: string | null;
  canBecomeShift: boolean;
  blockReasons: string[];
  warningCode: string | null;
  warningMessage: string | null;
};

export type ShiftPlanningWorkingPreviewResponse = {
  cinemaId: number;
  year: number;
  month: number;
  checkedAt: string;
  source: "MONTH_PLAN_WORKING_PREVIEW" | "SAVED_DRAFT_PREVIEW";
  persistsDraft: boolean;
  summary: {
    itemCount: number;
    readyItemCount: number;
    blockedItemCount: number;
    existingShiftCount: number;
    pastItemCount: number;
    warningCount: number;
    hasProblems: boolean;
  };
  warnings: Array<{ code: string; dateKey?: string; message: string }>;
  items: ShiftPlanningWorkingPreviewItem[];
};
