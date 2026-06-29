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

export type JobFunction = {
  id: number;
  cinemaId: number;
  name: string;
  description: string | null;
  color: string;
  sortOrder: number;
  dayPeriodId: number | null;
  dayPeriod: DayPeriod | null;
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
  jobFunction?: Pick<JobFunction, "id" | "name" | "color" | "isActive" | "cinemaId">;
};
