export type StaffingRequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

export type StaffingRequestType =
  | "EXTRA_SHIFT"
  | "EMERGENCY"
  | "REPLACEMENT"
  | "OVERTIME";

export type StaffingRequestUser = {
  id?: number;
  firstName: string;
  lastName: string;
};

export type StaffingRequest = {
  id: number;
  type: StaffingRequestType;
  status: StaffingRequestStatus;
  priority: number;
  message?: string | null;
  aiGenerated: boolean;
  createdAt: string;
  requestStartTime?: string | null;
  requestEndTime?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  requestedByUser?: StaffingRequestUser | null;
  targetUser?: StaffingRequestUser | null;
  shift?: {
    startTime: string;
    endTime: string;
    workType?: {
      name: string;
    } | null;
  } | null;
  workType?: {
    name: string;
  } | null;
};

export type GroupedStaffingRequests = {
  emergency: StaffingRequest[];
  pending: StaffingRequest[];
  completed: StaffingRequest[];
};
