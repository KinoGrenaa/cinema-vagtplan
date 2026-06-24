export type PayrollType = {
  id: number;
  name: string;
  payrollCode: string;
};

export type WorkType = {
  id: number;
  name: string;
  color?: string | null;
  isActive: boolean;
  archivedAt?: string | null;
  payrollTypeId?: number | null;
  payrollType?: PayrollType | null;
};

export type CurrentUser = {
  sub: number;
  email: string;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  cinemaId: number | null;
};
