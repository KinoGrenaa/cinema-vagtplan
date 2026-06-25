export type User = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  profileImage?: string | null;
  address?: string | null;
  birthDate?: string | null;
  emergencyPhone?: string | null;
  skills?: string | null;
};

export type CurrentUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  cinemaId: number | null;
};
