export type WeekParity = "ANY" | "EVEN" | "ODD";

export type ScheduleTemplateAssignment = {
  id: number;
  userId?: number | null;
  sortOrder?: number | null;
  user?: { id: number } | null;
};

export type TemplateJobFunction = {
  id: number;
  jobFunctionId: number;
  requiredCount: number;
  sortOrder: number;
  note: string | null;
  assignments?: ScheduleTemplateAssignment[];
};

export type TemplateDay = {
  weekday: number;
  isActive: boolean;
  note: string | null;
  sortOrder: number;
  jobFunctions: TemplateJobFunction[];
};

export type ScheduleTemplateCopySource = {
  id: number;
  name: string;
  description: string | null;
  weekParity: WeekParity;
  sortOrder: number;
  days?: TemplateDay[];
};

export type TemplateStaffingSummary = {
  dayCount: number;
  jobFunctionCount: number;
  shiftCount: number;
  assignedShiftCount: number;
  openShiftCount: number;
};

export type TemplateCopyDaySummary = {
  weekday: number;
  isActive: boolean;
  jobFunctionCount: number;
  shiftCount: number;
  assignedShiftCount: number;
  openShiftCount: number;
};
