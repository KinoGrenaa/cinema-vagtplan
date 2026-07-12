export type SystemErrorSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";
export type SystemErrorStatus = "NEW" | "SEEN" | "RESOLVED" | "IGNORED";
export type StatusFilter = SystemErrorStatus | "ACTIVE" | "";
export type SeverityFilter = SystemErrorSeverity | "";
export type LogAction = "seen" | "resolve" | "ignore";

export type SystemErrorLog = {
  id: number;
  createdAt: string;
  updatedAt: string;
  severity: SystemErrorSeverity;
  status: SystemErrorStatus;
  source: string;
  method: string | null;
  path: string | null;
  action: string | null;
  message: string;
  technicalMessage: string | null;
  correlationId: string | null;
  statusCode: number | null;
  userId: number | null;
  userRole: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  userEmail: string | null;
  cinemaId: number | null;
  cinemaName: string | null;
  resolvedAt: string | null;
  resolvedByUserId: number | null;
  resolvedByFirstName: string | null;
  resolvedByLastName: string | null;
  resolvedByEmail: string | null;
  resolutionNote: string | null;
};

export type SystemErrorLogRetentionSummary = {
  policy: {
    activeStatusesDays: number;
    resolvedStatusesDays: number;
    criticalSeverityDays: number;
    description: string[];
    evaluatedAt: string;
    cutoffs: {
      activeStatusesBefore: string;
      resolvedStatusesBefore: string;
      criticalSeverityBefore: string;
    };
  };
  summary: {
    totalCount: number;
    eligibleForCleanupCount: number;
    keepCount: number;
    activeEligibleCount: number;
    resolvedEligibleCount: number;
    criticalEligibleCount: number;
    oldestCreatedAt: string | null;
    newestCreatedAt: string | null;
  };
};

export type SystemErrorLogRetentionCleanupResult = {
  deletedCount: number;
  before: SystemErrorLogRetentionSummary["summary"];
  after: SystemErrorLogRetentionSummary["summary"];
  policy: SystemErrorLogRetentionSummary["policy"];
};
