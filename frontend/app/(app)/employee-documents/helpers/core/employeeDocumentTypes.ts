export type CurrentUser = {
  id?: number;
  sub?: number;
  email?: string;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  cinemaId: number | null;
};

export type User = {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
};

export type EmployeeDocument = {
  id: number;
  title: string;
  fileUrl: string;
  fileName: string;
  fileType?: string;
  createdAt: string;
};
