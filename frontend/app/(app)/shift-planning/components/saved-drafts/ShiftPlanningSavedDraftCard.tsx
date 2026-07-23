import {
  formatCreatedAt,
} from "../../helpers/shiftPlanningDraftHelpers";
import type {
  SavedDraftSummary,
} from "../../helpers/shiftPlanningDraftTypes";
import {
  getSavedDraftOpenActionLabel,
} from "../../helpers/shiftPlanningSavedDraftAttention";
import {
  ShiftPlanningSavedDraftAttentionNotice,
} from "./ShiftPlanningSavedDraftAttentionNotice";
import {
  ShiftPlanningSavedDraftStatsRow,
} from "./ShiftPlanningSavedDraftStatsRow";
import {
  ShiftPlanningSavedDraftStatusBadge,
} from "./ShiftPlanningSavedDraftStatusBadge";

type ShiftPlanningSavedDraftCardProps = {
  draft: SavedDraftSummary;
  isSelected: boolean;
  openingDraftId:
    | number
    | string
    | null;
  deletingDraftId:
    | number
    | string
    | null;
  onDeleteDraft: (
    draft: SavedDraftSummary,
  ) => void;
  onOpenDraft: (
    draftId: number | string,
  ) => void;
};

export function ShiftPlanningSavedDraftCard({
  draft,
  isSelected,
  openingDraftId,
  deletingDraftId,
  onDeleteDraft,
  onOpenDraft,
}: ShiftPlanningSavedDraftCardProps) {
  const isOpening =
    String(openingDraftId ?? "") ===
    String(draft.id);
  const isDeleting =
    String(deletingDraftId ?? "") ===
    String(draft.id);
  const canDelete =
    String(
      draft.status ?? "",
    ).toUpperCase() !== "PUBLISHED";
  const openActionLabel =
    getSavedDraftOpenActionLabel(
      draft,
    );

  return (
    <article
      className={`rounded-2xl border p-4 text-gray-900 shadow-sm transition dark:text-gray-100 ${
        isSelected
          ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
          : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-gray-950 dark:text-white">
              Forhåndsvisning #
              {draft.id}
            </h3>

            <ShiftPlanningSavedDraftStatusBadge
              status={draft.status}
            />
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300">
            Gemt{" "}
            {formatCreatedAt(
              draft.createdAt,
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canDelete && (
            <button
              type="button"
              onClick={() =>
                onDeleteDraft(draft)
              }
              className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-400 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-red-50 disabled:text-red-400 dark:border-red-900/70 dark:bg-gray-950 dark:text-red-200 dark:hover:bg-red-950/40 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-gray-950 dark:disabled:bg-red-950/30 dark:disabled:text-red-500"
              disabled={isDeleting}
            >
              {isDeleting
                ? "Sletter..."
                : "Slet"}
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              onOpenDraft(draft.id)
            }
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white dark:focus-visible:ring-gray-300 dark:focus-visible:ring-offset-gray-950 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
            disabled={
              isOpening || isDeleting
            }
          >
            {isOpening
              ? "Åbner..."
              : openActionLabel}
          </button>
        </div>
      </div>

      {draft.note && (
        <p className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
          {draft.note}
        </p>
      )}

      <ShiftPlanningSavedDraftAttentionNotice
        draft={draft}
      />

      <ShiftPlanningSavedDraftStatsRow
        draft={draft}
      />
    </article>
  );
}
