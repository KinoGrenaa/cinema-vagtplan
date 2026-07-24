import {
  getDraftPreviewRowOpenActionLabel,
} from "../../helpers/shiftPlanningDraftPreviewPriority";
import {
  formatDateKey,
  formatTemplateLabel,
  getWeekdayName,
} from "../../helpers/shiftPlanningHelpers";
import type {
  DraftPreviewRow,
} from "./ShiftPlanningDraftPreview";

type ShiftPlanningDraftPreviewRowCardProps = {
  row: DraftPreviewRow;
  onOpen: () => void;
};

export function ShiftPlanningDraftPreviewRowCard({
  row,
  onOpen,
}: ShiftPlanningDraftPreviewRowCardProps) {
  const openActionLabel =
    getDraftPreviewRowOpenActionLabel(
      row,
    );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-950 dark:text-white">
            {getWeekdayName(
              row.dateKey,
              "long",
            )}{" "}
            {formatDateKey(
              row.dateKey,
            )}
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {row.template
              ? formatTemplateLabel(
                  row.template,
                )
              : "Skabelon mangler ugedagsdata"}
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {row.requiredCount} vagter
            {row.emptyCount > 0
              ? ` · ${row.emptyCount} tomme`
              : ""}
          </p>
          {(row.warning ||
            !row.hasTemplateDay) && (
            <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              {!row.hasTemplateDay &&
                "Mangler ugedagsopsætning"}
              {row.warning &&
                `${
                  !row.hasTemplateDay
                    ? " · "
                    : ""
                }Tjek ugeopsætning`}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900 dark:active:bg-gray-800 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-950"
        >
          {openActionLabel}
        </button>
      </div>
    </div>
  );
}
