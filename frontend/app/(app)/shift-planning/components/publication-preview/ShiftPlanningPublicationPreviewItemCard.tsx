import { formatMinute } from "../../helpers/shiftPlanningDraftHelpers";
import type { DraftPublicationPreviewItem } from "../../helpers/shiftPlanningDraftTypes";
import { formatDateKey } from "../../helpers/shiftPlanningHelpers";

type ShiftPlanningPublicationPreviewItemCardProps = {
  item: DraftPublicationPreviewItem;
  index: number;
};

export function ShiftPlanningPublicationPreviewItemCard({
  item,
  index,
}: ShiftPlanningPublicationPreviewItemCardProps) {
  const itemDate = item.dateKey ? formatDateKey(item.dateKey) : "Dato mangler";
  const blockReasons = item.blockReasons ?? [];
  const startTime = formatMinute(item.plannedStartMinute);
  const endTime = formatMinute(item.plannedEndMinute);

  return (
    <div
      key={`${item.draftItemId ?? index}-${item.dateKey ?? "no-date"}`}
      className="rounded-xl border border-blue-200 bg-white p-3 text-sm text-blue-950 dark:border-blue-900/70 dark:bg-gray-950/70 dark:text-blue-100"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-1 text-xs font-semibold ${
              item.canBecomeShift
                ? "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-100"
                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-100"
            }`}
          >
            {item.canBecomeShift ? "Kan oprettes" : "Blokeret"}
          </span>
          <span className="font-semibold">{itemDate}</span>
        </div>

        <span className="text-xs text-blue-700 dark:text-blue-200/70">
          {startTime && endTime ? `kl. ${startTime} - ${endTime}` : "Mangler tid"}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-blue-800 dark:text-blue-200/80">
        {item.jobFunctionColor && (
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.jobFunctionColor }}
          />
        )}
        <span>{item.jobFunctionName || "Jobfunktion mangler"}</span>
        <span>·</span>
        <span>{item.userName || "Uden medarbejder"}</span>
        <span>·</span>
        <span>Forslag #{item.draftItemId ?? "?"}</span>
      </div>

      {blockReasons.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-800 dark:text-amber-100">
          {blockReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}

      {item.warningMessage && (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100">
          Kontroladvarsel: {item.warningMessage}
        </div>
      )}
    </div>
  );
}
