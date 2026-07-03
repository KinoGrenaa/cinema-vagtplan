type ShiftPlanningDraftPreviewMetricsPanelProps = {
  totalDraftShifts: number;
  totalStandardAssignments: number;
  totalEmptyDraftShifts: number;
  rowCount: number;
};

export function ShiftPlanningDraftPreviewMetricsPanel({
  totalDraftShifts,
  totalStandardAssignments,
  totalEmptyDraftShifts,
  rowCount,
}: ShiftPlanningDraftPreviewMetricsPanelProps) {
  return (
    <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
      <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
        {rowCount} datoer med skabelon
      </span>
      <span className="rounded-full bg-green-50 px-3 py-1 text-green-800 dark:bg-green-950/40 dark:text-green-200">
        {totalDraftShifts} vagter
      </span>
      <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700 dark:bg-gray-900 dark:text-gray-200">
        {totalStandardAssignments} med standard
      </span>
      <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        {totalEmptyDraftShifts} tomme
      </span>
    </div>
  );
}
