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
  status: "OPEN" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  type: "POOL" | "DIRECT";
  message?: string | null;
  offeredByUserId: number;
  acceptedByUserId?: number | null;
  targetUserId?: number | null;
  offeredByUser: User;
  targetUser?: User | null;
  acceptedByUser?: User | null;
  approvedLeaveConflict?: ApprovedLeaveConflict | null;
  shift: {
    id: number;
    startTime: string;
    endTime: string;
    userId: number;
    user: User;
    workType: {
      name: string;
      color?: string | null;
    };
  };
};
