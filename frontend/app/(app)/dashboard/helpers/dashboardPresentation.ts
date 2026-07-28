const LEADING_INSIGHT_MARKER = /^(?:ℹ️|🤖|🚨|✅|📈)\s*/u;

export function cleanDashboardInsight(value: string) {
  return value.replace(LEADING_INSIGHT_MARKER, "").trim();
}

export function formatDashboardCount(
  value: number,
  singular: string,
  plural: string,
) {
  return `${value} ${value === 1 ? singular : plural}`;
}
