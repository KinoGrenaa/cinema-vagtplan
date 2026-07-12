export type User = {
  id: number;
  firstName: string;
  lastName: string;
};

export type TimeEntry = {
  id: number;
  clockIn: string;
  clockOut?: string | null;
  userId: number;
};

export type Shift = {
  id: number;
  startTime: string;
  endTime: string;
  userId: number;
  user: User;
  workType: {
    name: string;
    color: string;
  };
};

export type MovieShowing = {
  id: number;
  title: string;
  hall: string;
  startTime: string;
  endTime: string;
  soldSeats: number;
  freeSeats: number;
};
