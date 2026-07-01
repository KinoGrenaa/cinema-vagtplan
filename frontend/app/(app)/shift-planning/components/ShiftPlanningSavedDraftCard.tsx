import { formatCreatedAt, toNumber } from "../helpers/shiftPlanningDraftHelpers";
import type { SavedDraftSummary } from "../helpers/shiftPlanningDraftTypes";

type ShiftPlanningSavedDraftCardProps = {
  draft: SavedDraftSummary;
  isSelected: boolean;
  openingDraftId: number | string | null;
  onOpenDraft: (draftId: number | string) => void;
};

function formatDraftStatus(status?: string | null) {
  switch (status) {
    case "DRAFT":
      return "Kladde";
    case "SUPERSEDED":
      return "Erstattet";
    case "PUBLISHED":
      return "Publiceret";
    case "CANCELLED":
      return "Annulleret";
    default:
      return status || "Ukendt status";
  }
}

function getStatusClasses(status?: string | null) {
  if (status === "DRAFT") {
    return "bg-green-100 text-green-900 ring-green-200 dark:bg-green-950/60 dark:text-green-200 dark:ring-green-900";
  }

  if (status === "SUPERSEDED") {
    return "bg-gray-100 text-gray-700 ring-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-800";
  }

  return "bg-blue-100 text-blue-900 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:ring-blue-900";
}

export function ShiftPlanningSavedDraftCard({
  draft,
  isSelected,
  openingDraftId,
  onOpenDraft,
}: ShiftPlanningSavedDraftCardProps) {
  const isOpening = String(openingDraftId ?? "") === String(draft.id);

  return (
    <article
      className={`rounded-2xl border p-4 transition ${
        isSelected
          ? "border-blue-400 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
          : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-950/40 dark:hover:border-gray-700"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-950 dark:text-gray-50">
              Kladde #{draft.id}
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${getStatusClasses(
                draft.status,
              )}`}
            >
              {formatDraftStatus(draft.status)}
            </span>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Gemt {formatCreatedAt(draft.createdAt)}
          </p>

          <div className="flex flex-wrap gap-2 text-xs text-gray-700 dark:text-gray-300">
            <span>{toNumber(draft.itemCount)} poster</span>
            <span>{toNumber(draft.unassignedItemCount)} uden standard</span>
            <span>{toNumber(draft.warningItemCount)} advarsler</span>
          </div>

          {draft.note && (
            <p className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-300">
              {draft.note}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => onOpenDraft(draft.id)}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white"
          disabled={isOpening}
        >
          {isOpening ? "Åbner..." : "Åbn kladde"}
        </button>
      </div>
    </article>
  );
}
