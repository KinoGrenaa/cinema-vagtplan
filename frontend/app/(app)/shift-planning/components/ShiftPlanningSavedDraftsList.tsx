import type { Dispatch, SetStateAction } from "react";

import { ShiftPlanningSavedDraftCard } from "./ShiftPlanningSavedDraftCard";
import { ShiftPlanningSavedDraftsFilterPanel } from "./ShiftPlanningSavedDraftsFilterPanel";
import { ShiftPlanningSavedDraftsListMessages } from "./ShiftPlanningSavedDraftsListMessages";
import { ShiftPlanningSavedDraftsTogglePanel } from "./ShiftPlanningSavedDraftsTogglePanel";
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

  const filterOptions = DRAFT_STATUS_FILTERS.map((filter) => ({
    ...filter,
    count: draftStatusCounts[filter.value] ?? 0,
  }));

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
  const selectedFilterText = formatSelectedFilterText(draftStatusFilter);

  const selectDraftStatusFilter = (filter: DraftStatusFilter) => {
    setDraftStatusFilter(filter);
    setShowAllDrafts(false);
  };

  return (
    <>
      {drafts.length > 0 && (
        <ShiftPlanningSavedDraftsFilterPanel
          activeFilter={draftStatusFilter}
          filters={filterOptions}
          onSelectFilter={selectDraftStatusFilter}
        />
      )}

      <ShiftPlanningSavedDraftsListMessages
        errorMessage={errorMessage}
        hasAnyDrafts={drafts.length > 0}
        hasMatchingDrafts={filteredDrafts.length > 0}
        loading={loading}
        selectedFilterText={selectedFilterText}
      />

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
        <ShiftPlanningSavedDraftsTogglePanel
          filteredDraftCount={filteredDrafts.length}
          hiddenDraftCount={hiddenDraftCount}
          selectedFilterText={selectedFilterText}
          showAllDrafts={showAllDrafts}
          onToggle={() => setShowAllDrafts((current) => !current)}
        />
      )}
    </>
  );
}
