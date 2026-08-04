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
  activeUserCount?: number;
  inactiveUserCount?: number;
  _count?: {
    users?: number;
    shifts?: number;
    jobFunctions?: number;
  };
};
