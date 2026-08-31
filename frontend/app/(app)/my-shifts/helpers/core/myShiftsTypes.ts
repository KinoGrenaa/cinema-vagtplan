export type CurrentUser = {
  id: number;
  role: string;
  cinemaId: number | null;
};

export type User = {
  id: number;
  firstName: string;
  lastName: string;
  profileImage?: string | null;
  jobFunctionIds?: number[];
};

export type Shift = {
  id: number;
  startTime: string;
  endTime: string;
  note?: string | null;
  userId: number;
  jobFunctionId: number;
  jobFunction: {
    name: string;
    color: string;
  };
};

export type ShiftTrade = {
  id: number;
  status: "OPEN" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  type: "POOL" | "DIRECT";
  shiftId: number;
  offeredByUserId: number;
  targetUserId?: number | null;
  offeredByUser?: User | null;
  targetUser?: User | null;
  shift?: {
    startTime: string;
    endTime: string;
    jobFunction?: {
      name: string;
    };
  };
};

export type CinemaSettings = {
  allowShiftTradePool: boolean;
  allowShiftTradeDirect: boolean;
};
