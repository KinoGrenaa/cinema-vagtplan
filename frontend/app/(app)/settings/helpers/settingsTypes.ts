export type CurrentUser = {
  id: number;
  role: string;
  cinemaId: number | null;
};

export type CinemaMembership = {
  id: number;
  cinemaId: number;
  isHomeCinema: boolean;
  createdAt: string;
  cinema: {
    id: number;
    name: string;
    logoUrl?: string | null;
  };
};
