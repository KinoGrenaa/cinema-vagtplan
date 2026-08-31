export type CurrentUser = {
  sub: number;
  email: string;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  cinemaId: number | null;
};

export type PayrollExportCode = {
  id: number;
  name: string;
  payrollCode?: string | null;
  exportCode?: string | null;
  description?: string | null;
  color?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
};

export type JobFunctionTimingAnchor =
  | "FIRST_MOVIE_START"
  | "FIRST_MOVIE_END"
  | "LAST_MOVIE_START"
  | "LAST_MOVIE_END"
  | "FIXED_TIME";
export type JobFunctionTimingRule = {
  id: number;
  cinemaId: number;
  jobFunctionId: number;
  filmWindowStartMinute: number;
  filmWindowEndMinute: number;
  startAnchor: JobFunctionTimingAnchor;
  startOffsetMinutes: number;
  startFixedMinute: number | null;
  endAnchor: JobFunctionTimingAnchor;
  endOffsetMinutes: number;
  endFixedMinute: number | null;
  fallbackStartMinute: number;
  fallbackEndMinute: number;
  roundToQuarter?: boolean;
  roundStartToNearestQuarter: boolean;
  roundEndToNearestQuarter: boolean;
  restrictMovieStartsToWindow: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  jobFunction?: {
    id: number;
    name: string;
    color: string;
    isActive: boolean;
    cinemaId: number;
  };
};
export type JobFunction = {
  id: number;
  cinemaId: number;
  name: string;
  nameKey?: string;
  description: string | null;
  color: string;
  sortOrder: number;
  defaultPayrollExportCodeId: number | null;
  defaultPayrollExportCode: PayrollExportCode | null;
  timingRule?: JobFunctionTimingRule | null;
  isActive: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    userJobFunctions?: number;
    shifts?: number;
  };
};
export type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string | null;
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
