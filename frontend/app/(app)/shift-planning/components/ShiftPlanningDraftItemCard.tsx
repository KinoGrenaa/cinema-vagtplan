import {
  formatDraftItemTimeRange,
  formatDraftItemUserName,
  getItemJobFunctionName,
  getItemTemplateName,
} from "../helpers/shiftPlanningDraftHelpers";
import type { SavedDraftItem } from "../helpers/shiftPlanningDraftTypes";

type ShiftPlanningDraftItemCardProps = {
  item: SavedDraftItem;
};

export function ShiftPlanningDraftItemCard({
  item,
}: ShiftPlanningDraftItemCardProps) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-bold text-gray-950 dark:text-white">
            {formatDraftItemTimeRange(item)}
          </p>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
            {item.jobFunctionColor && (
              <span
                className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: item.jobFunctionColor,
                }}
              />
            )}
            {getItemJobFunctionName(item)}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {getItemTemplateName(item)}
          </p>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300 lg:text-right">
          Medarbejder: {formatDraftItemUserName(item)}
        </div>
      </div>

      {item.warningMessage && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100">
          Advarsel: {item.warningMessage}
        </div>
      )}
    </article>
  );
}
