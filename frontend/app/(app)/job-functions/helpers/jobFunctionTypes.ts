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
