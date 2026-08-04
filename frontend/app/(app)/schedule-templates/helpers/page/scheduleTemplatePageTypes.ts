export type CurrentUser = {
  sub: number;
  email: string;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  cinemaId: number | null;
};

export type WeekParity = "ANY" | "EVEN" | "ODD";



export type JobFunction = {
  id: number;
  name: string;
  description: string | null;
  color: string;
  isActive: boolean;
  timingRule?: {
    filmWindowStartMinute: number;
    filmWindowEndMinute: number;
    roundToQuarter?: boolean;
    roundStartToNearestQuarter: boolean;
    roundEndToNearestQuarter: boolean;
    restrictMovieStartsToWindow: boolean;
    isActive: boolean;
  } | null;
};

export type ScheduleTemplateUser = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role?: "MASTER" | "ADMIN" | "EMPLOYEE";
  isActive?: boolean;
};

export type ScheduleTemplateAssignment = {
  id: number;
  userId?: number | null;
  sortOrder?: number | null;
  user?: ScheduleTemplateUser | null;
};

export type TemplateJobFunction = {
  id: number;
  jobFunctionId: number;
  requiredCount: number;
  sortOrder: number;
  note: string | null;
  jobFunction: JobFunction;
  assignments?: ScheduleTemplateAssignment[];
};

export type TemplateDay = {
  id: number;
  weekday: number;
  isActive: boolean;
  note: string | null;
  sortOrder: number;
  jobFunctions: TemplateJobFunction[];
};

export type ScheduleTemplate = {
  id: number;
  name: string;
  description: string | null;
  weekParity: WeekParity;
  startsOn: string | null;
  sortOrder: number;
  isActive: boolean;
  archivedAt: string | null;
  days?: TemplateDay[];
};

export type TemplateFormState = {
  name: string;
  description: string;
  weekParity: WeekParity;
  sortOrder: string;
};

export type DayFormState = {
  isActive: boolean;
  note: string;
  sortOrder: string;
};

export type JobFunctionFormState = {
  jobFunctionId: string;
  requiredCount: string;
  sortOrder: string;
  note: string;
};
