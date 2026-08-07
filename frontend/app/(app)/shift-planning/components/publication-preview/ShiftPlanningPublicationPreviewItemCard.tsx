import { formatMinute } from "../../helpers/shiftPlanningDraftHelpers";
import { getPublicationPreviewItemActionHint } from "../../helpers/shiftPlanningIssueActionHints";
import type { DraftPublicationPreviewItem } from "../../helpers/shiftPlanningDraftTypes";
import { formatDateKey } from "../../helpers/shiftPlanningHelpers";

type ShiftPlanningPublicationPreviewItemCardProps = {
  item: DraftPublicationPreviewItem;
};

function getStatusLabel(
  item: DraftPublicationPreviewItem,
  blockReasons: string[],
) {
  const normalizedReasons = blockReasons.join(" ").toLowerCase();

  if (normalizedReasons.includes("datoen er overstået")) {
    return "Overstået dato";
  }

  if (
    normalizedReasons.includes(
      "samme jobfunktion og tidspunkt i vagtplanen",
    )
  ) {
    return "Allerede i vagtplanen";
  }

  return item.canBecomeShift ? "Kan oprettes" : "Blokeret";
}

export function ShiftPlanningPublicationPreviewItemCard({
  item,
}: ShiftPlanningPublicationPreviewItemCardProps) {
  const itemDate = item.dateKey ? formatDateKey(item.dateKey) : "Dato mangler";
  const blockReasons = item.blockReasons ?? [];
  const actionHint = getPublicationPreviewItemActionHint(item);
  const startTime = formatMinute(item.plannedStartMinute);
  const endTime = formatMinute(item.plannedEndMinute);
  const statusLabel = getStatusLabel(item, blockReasons);

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        <span>{statusLabel}</span>
        <span>{itemDate}</span>
      </div>
      <p className="mt-2 font-semibold text-gray-900 dark:text-white">
        {startTime && endTime ? `kl. ${startTime} - ${endTime}` : "Mangler tid"}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-gray-700 dark:text-gray-300">
        {item.jobFunctionColor && (
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: item.jobFunctionColor }}
          />
        )}
        <span>{item.jobFunctionName || "Jobfunktion mangler"}</span>
        <span>·</span>
        <span>{item.userName || "Uden medarbejder"}</span>
      </p>
      {blockReasons.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          {blockReasons.map((reason) => (
            <li key={reason}>• {reason}</li>
          ))}
        </ul>
      )}
      {item.warningMessage && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <span className="font-semibold">Kontroladvarsel:</span>{" "}
          {item.warningMessage}
        </p>
      )}
      {actionHint && (
        <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100">
          <span className="font-semibold">Næste handling:</span>{" "}
          <span>{actionHint.text}</span>
          {actionHint.href && (
            <a
              href={actionHint.href}
              className="ml-2 inline-flex rounded-full border border-sky-300 px-2 py-0.5 font-semibold text-sky-800 hover:bg-sky-100 dark:border-sky-700 dark:text-sky-100 dark:hover:bg-sky-900"
            >
              {actionHint.linkLabel ?? "Åbn"}
            </a>
          )}
        </div>
      )}
    </article>
  );
}
