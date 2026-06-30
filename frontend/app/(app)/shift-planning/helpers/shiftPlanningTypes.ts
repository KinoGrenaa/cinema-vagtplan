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

export type ScheduleTemplateDayPeriodSummary = {
  id: number;
  cinemaId: number;
  name: string;
  startMinute: number;
  endMinute: number;
  sortOrder: number;
  isActive: boolean;
  archivedAt: string | null;
};

export type ScheduleTemplateTimingRuleSummary = {
  id: number;
  cinemaId: number;
  jobFunctionId: number;
  startAnchor: string;
  startOffsetMinutes: number;
  startFixedMinute: number | null;
  endAnchor: string;
  endOffsetMinutes: number;
  endFixedMinute: number | null;
  fallbackStartMinute: number | null;
  fallbackEndMinute: number | null;
  clampToDayPeriod: boolean;
  isActive: boolean;
};

export type ScheduleTemplateJobFunctionDetail = {
  id: number;
  cinemaId: number;
  name: string;
  description: string | null;
  color: string;
  sortOrder: number;
  dayPeriodId: number | null;
  dayPeriod: ScheduleTemplateDayPeriodSummary | null;
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
