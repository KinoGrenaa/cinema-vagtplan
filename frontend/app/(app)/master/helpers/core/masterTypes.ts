export type CurrentUser = {
  id?: number;
  sub?: number;
  email: string;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  cinemaId: number | null;
};

export type Cinema = {
  id: number;
  name: string;
  logoUrl?: string | null;
  createdAt?: string;
  _count?: {
    users?: number;
    shifts?: number;
    workTypes?: number;
  };
};
