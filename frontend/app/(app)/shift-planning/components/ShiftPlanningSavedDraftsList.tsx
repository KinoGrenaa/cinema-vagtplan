import type { Dispatch, SetStateAction } from "react";

import { ShiftPlanningSavedDraftCard } from "./ShiftPlanningSavedDraftCard";
import type { SavedDraftSummary } from "../helpers/shiftPlanningDraftTypes";

export type DraftStatusFilter =
  | "ALL"
  | "DRAFT"
  | "PUBLISHED"
  | "SUPERSEDED"
  | "OTHER";

type ShiftPlanningSavedDraftsListProps = {
  drafts: SavedDraftSummary[];
  loading: boolean;
  errorMessage: string | null;
  selectedDraftId: number | string | null;
  openingDraftId: number | string | null;
  draftStatusFilter: DraftStatusFilter;
  setDraftStatusFilter: Dispatch<SetStateAction<DraftStatusFilter>>;
  showAllDrafts: boolean;
  setShowAllDrafts: Dispatch<SetStateAction<boolean>>;
  onOpenDraft: (draftId: number | string) => void;
};

const DRAFT_STATUS_FILTERS: Array<{
  value: DraftStatusFilter;
  label: string;
}> = [
  { value: "ALL", label: "Alle" },
  { value: "DRAFT", label: "Kladder" },
  { value: "PUBLISHED", label: "Publicerede" },
  { value: "SUPERSEDED", label: "Erstattede" },
  { value: "OTHER", label: "Andre" },
];

const MAX_VISIBLE_DRAFTS = 5;

function getDraftStatusFilterValue(status?: string | null): DraftStatusFilter {
  if (status === "DRAFT" || status === "PUBLISHED" || status === "SUPERSEDED") {
    return status;
  }

  return "OTHER";
}

function draftMatchesStatusFilter(
  draft: SavedDraftSummary,
  filter: DraftStatusFilter,
) {
  if (filter === "ALL") {
    return true;
  }

  return getDraftStatusFilterValue(draft.status) === filter;
}

function getDraftStatusCount(
  drafts: SavedDraftSummary[],
  filter: DraftStatusFilter,
) {
  if (filter === "ALL") {
    return drafts.length;
  }

  return drafts.filter((draft) => draftMatchesStatusFilter(draft, filter))
    .length;
}

function formatSelectedFilterText(filter: DraftStatusFilter) {
  switch (filter) {
    case "DRAFT":
      return "åbne kladder";
    case "PUBLISHED":
      return "publicerede kladder";
    case "SUPERSEDED":
      return "erstattede kladder";
    case "OTHER":
      return "andre kladder";
    default:
      return "kladder";
  }
}

export function ShiftPlanningSavedDraftsList({
  drafts,
  loading,
  errorMessage,
  selectedDraftId,
  openingDraftId,
  draftStatusFilter,
  setDraftStatusFilter,
  showAllDrafts,
  setShowAllDrafts,
  onOpenDraft,
}: ShiftPlanningSavedDraftsListProps) {
  const draftStatusCounts = DRAFT_STATUS_FILTERS.reduce(
    (counts, filter) => ({
      ...counts,
      [filter.value]: getDraftStatusCount(drafts, filter.value),
    }),
    {} as Record<DraftStatusFilter, number>,
  );

  const filteredDrafts = drafts.filter((draft) =>
    draftMatchesStatusFilter(draft, draftStatusFilter),
  );
  const visibleDrafts = showAllDrafts
    ? filteredDrafts
    : filteredDrafts.slice(0, MAX_VISIBLE_DRAFTS);
  const hiddenDraftCount = Math.max(
    0,
    filteredDrafts.length - visibleDrafts.length,
  );
  const canToggleDraftList = filteredDrafts.length > MAX_VISIBLE_DRAFTS;

  return (
    <>
      {drafts.length > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
          <div className="mb-3 space-y-1">
            <h3 className="text-sm font-semibold text-gray-950 dark:text-gray-50">
              Filtrér kladder
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Vælg om du vil fokusere på åbne, publicerede eller erstattede kladder.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {DRAFT_STATUS_FILTERS.map((filter) => {
              const isActive = draftStatusFilter === filter.value;
              const count = draftStatusCounts[filter.value] ?? 0;

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => {
                    setDraftStatusFilter(filter.value);
                    setShowAllDrafts(false);
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                    isActive
                      ? "bg-blue-600 text-white ring-blue-600 dark:bg-blue-500 dark:ring-blue-500"
                      : "bg-white text-gray-700 ring-gray-200 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-800 dark:hover:bg-gray-800"
                  }`}
                >
                  {filter.label} · {count}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {errorMessage}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-300">
          Henter gemte kladder...
        </div>
      )}

      {!loading && drafts.length === 0 && !errorMessage && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-300">
          Der er endnu ingen gemte kladder for måneden.
        </div>
      )}

      {!loading && drafts.length > 0 && filteredDrafts.length === 0 && !errorMessage && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-300">
          Der er ingen {formatSelectedFilterText(draftStatusFilter)} i denne måned.
        </div>
      )}

      {!loading && visibleDrafts.length > 0 && (
        <div className="space-y-3">
          {visibleDrafts.map((draft) => (
            <ShiftPlanningSavedDraftCard
              key={draft.id}
              draft={draft}
              isSelected={
                selectedDraftId !== null && String(selectedDraftId) === String(draft.id)
              }
              openingDraftId={openingDraftId}
              onOpenDraft={onOpenDraft}
            />
          ))}
        </div>
      )}

      {canToggleDraftList && (
        <div className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-300 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {showAllDrafts
              ? `Alle ${filteredDrafts.length} ${formatSelectedFilterText(
                  draftStatusFilter,
                )} vises.`
              : `${hiddenDraftCount} ældre ${formatSelectedFilterText(
                  draftStatusFilter,
                )} er skjult i den kompakte visning.`}
          </span>
          <button
            type="button"
            onClick={() => setShowAllDrafts((current) => !current)}
            className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-white dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-900"
          >
            {showAllDrafts ? "Vis færre" : `Vis alle ${filteredDrafts.length}`}
          </button>
        </div>
      )}
    </>
  );
}
