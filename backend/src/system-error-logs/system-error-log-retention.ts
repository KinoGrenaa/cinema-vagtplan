export const SYSTEM_ERROR_LOG_RETENTION_POLICY = {
  activeStatusesDays: 180,
  resolvedStatusesDays: 90,
  criticalSeverityDays: 365,
} as const;

export type SystemErrorLogRetentionCutoffs = {
  activeStatusesBefore: Date;
  resolvedStatusesBefore: Date;
  criticalSeverityBefore: Date;
};

function subtractDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - days);
  return copy;
}

export function getSystemErrorLogRetentionCutoffs(
  now = new Date(),
): SystemErrorLogRetentionCutoffs {
  return {
    activeStatusesBefore: subtractDays(
      now,
      SYSTEM_ERROR_LOG_RETENTION_POLICY.activeStatusesDays,
    ),
    resolvedStatusesBefore: subtractDays(
      now,
      SYSTEM_ERROR_LOG_RETENTION_POLICY.resolvedStatusesDays,
    ),
    criticalSeverityBefore: subtractDays(
      now,
      SYSTEM_ERROR_LOG_RETENTION_POLICY.criticalSeverityDays,
    ),
  };
}
