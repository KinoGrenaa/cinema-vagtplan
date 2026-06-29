export type CurrentUser = {
  sub: number;
  email: string;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  cinemaId: number | null;
};

export type DayPeriod = {
  id: number;
  cinemaId: number;
  name: string;
  startMinute: number;
  endMinute: number;
  sortOrder: number;
  isActive: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type JobFunctionTimingAnchor =
  | "DAY_PERIOD_START"
  | "DAY_PERIOD_END"
  | "FIRST_MOVIE_START"
  | "LAST_MOVIE_END"
  | "FIXED_TIME";

export type JobFunctionTimingRule = {
  id: number;
  cinemaId: number;
  jobFunctionId: number;
  startAnchor: JobFunctionTimingAnchor;
  startOffsetMinutes: number;
  startFixedMinute: number | null;
  endAnchor: JobFunctionTimingAnchor;
  endOffsetMinutes: number;
  endFixedMinute: number | null;
  fallbackStartMinute: number | null;
  fallbackEndMinute: number | null;
  clampToDayPeriod: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  jobFunction?: {
    id: number;
    name: string;
    color: string;
    isActive: boolean;
    cinemaId: number;
    dayPeriod?: DayPeriod | null;
  };
};

export type JobFunction = {
  id: number;
  cinemaId: number;
  name: string;
  description: string | null;
  color: string;
  sortOrder: number;
  dayPeriodId: number | null;
  dayPeriod: DayPeriod | null;
  timingRule?: JobFunctionTimingRule | null;
  isActive: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    userJobFunctions?: number;
  };
};

export type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  isActive?: boolean;
  cinemaId?: number | null;
};

export type UserJobFunction = {
  id: number;
  cinemaId: number;
  userId: number;
  jobFunctionId: number;
  assignedByUserId: number | null;
  createdAt: string;
  user: User;
  assignedByUser?: Pick<User, "id" | "firstName" | "lastName" | "email"> | null;
  jobFunction?: Pick<
    JobFunction,
    "id" | "name" | "color" | "isActive" | "cinemaId"
  >;
};
