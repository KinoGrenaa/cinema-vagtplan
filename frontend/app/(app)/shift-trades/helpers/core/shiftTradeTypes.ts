export type User = {
  id: number;
  firstName: string;
  lastName: string;
};

export type ApprovedLeaveConflict = {
  id: number;
  startDate: string;
  endDate: string;
};

export type ShiftTrade = {
  id: number;
  status:
    | "OPEN"
    | "ACCEPTED"
    | "REJECTED"
    | "CANCELLED"
    | "EXPIRED";
  type:
    | "POOL"
    | "DIRECT";
  message?:
    string | null;
  offeredByUserId:
    number;
  acceptedByUserId?:
    number | null;
  targetUserId?:
    number | null;
  offeredByUser:
    User;
  targetUser?:
    User | null;
  acceptedByUser?:
    User | null;
  approvedLeaveConflict?:
    ApprovedLeaveConflict | null;
  hasShiftConflict?:
    boolean;
  shift: {
    id: number;
    startTime: string;
    endTime: string;
    userId: number;
    user: User;
    jobFunction: {
      name: string;
      color?:
        string | null;
    };
  };
};

export type ShiftTradeCursorPage = {
  items:
    ShiftTrade[];
  hasMore:
    boolean;
  nextBeforeId:
    number | null;
  totalCount:
    number;
};

export type ShiftTradePageResponse = {
  directTrades:
    ShiftTrade[];
  poolTrades:
    ShiftTrade[];
  directPage?: Omit<
    ShiftTradeCursorPage,
    "items"
  >;
  poolPage?: Omit<
    ShiftTradeCursorPage,
    "items"
  >;
  history: {
    items:
      ShiftTrade[];
    hasMore:
      boolean;
    nextBeforeId:
      number | null;
    totalCount:
      number;
  };
  target:
    ShiftTrade | null;
};
