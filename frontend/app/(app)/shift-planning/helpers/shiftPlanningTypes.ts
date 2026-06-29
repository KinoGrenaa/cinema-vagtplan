export type CurrentUser = {
  sub: number;
  email: string;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  cinemaId: number | null;
};

export type ScheduleTemplateWeekParity = "ANY" | "EVEN" | "ODD";

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
