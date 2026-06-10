export type TimeEntryStatus = "PENDING" | "APPROVED" | "REJECTED";

export type TimeEntryDeviation = {
  hasDeviation: boolean;
  requiresNote: boolean;

  types: string[];

  plannedMinutes: number | null;
  registeredMinutes: number | null;
  differenceMinutes: number | null;

  clockInDeviationMinutes: number | null;
  clockOutDeviationMinutes: number | null;

  messages: string[];
};

export type TimeEntry = {
  id: number;
  clockIn: string;
  clockOut?: string | null;
  status: TimeEntryStatus;

  note?: string | null;
  clockInNote?: string | null;
  clockOutNote?: string | null;
  adminNote?: string | null;

  user: {
    firstName: string;
    lastName: string;
    email: string;
  };

  shift?: {
    startTime?: string;
    endTime?: string;
    workType?: {
      name: string;
    };
  } | null;

  deviation?: TimeEntryDeviation;
};
