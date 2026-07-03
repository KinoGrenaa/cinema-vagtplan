import {
  formatDateKey,
  formatWeekParity,
  getWeekdayName,
} from "../../helpers/shiftPlanningHelpers";
import type { DraftPreviewRow } from "./ShiftPlanningDraftPreview";

type ShiftPlanningDraftPreviewRowCardProps = {
  row: DraftPreviewRow;
  onOpen: () => void;
};

export function ShiftPlanningDraftPreviewRowCard({
  row,
  onOpen,
}: ShiftPlanningDraftPreviewRowCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-2xl border border-blue-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-blue-900/70 dark:bg-gray-950/70 dark:hover:border-blue-700"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
        {getWeekdayName(row.dateKey, "long")} {formatDateKey(row.dateKey)}
      </p>
      <p className="mt-1 text-sm font-semibold text-gray-950 dark:text-white">
        {row.template
          ? `${row.template.name} · ${formatWeekParity(row.template.weekParity)}`
          : "Skabelon mangler ugedagsdata"}
      </p>
      <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
        {row.requiredCount} vagter
      </p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {row.jobFunctionCount} funktioner · {row.assignedCount} med standard · {row.emptyCount} tomme
        {!row.hasTemplateDay && " · mangler ugedagsopsætning"}
        {row.warning && " · tjek ugeparitet"}
      </p>
    </button>
  );
}
