import type { Dispatch, SetStateAction } from "react";

import { ShiftPlanningSavedDraftCard } from "./ShiftPlanningSavedDraftCard";
import { ShiftPlanningSavedDraftsFilterPanel } from "./ShiftPlanningSavedDraftsFilterPanel";
import { ShiftPlanningSavedDraftsListMessages } from "./ShiftPlanningSavedDraftsListMessages";
import { ShiftPlanningSavedDraftsTogglePanel } from "./ShiftPlanningSavedDraftsTogglePanel";
import {
  draftMatchesStatusFilter,
  formatSelectedDraftFilterText,
  getDraftStatusFilterOptions,
  getHiddenSavedDraftCount,
  getPrioritizedSavedDrafts,
  getVisibleSavedDrafts,
  MAX_VISIBLE_SAVED_DRAFTS,
  type DraftStatusFilter,
} from "../../helpers/shiftPlanningSavedDraftFilters";
import type { SavedDraftSummary } from "../../helpers/shiftPlanningDraftTypes";

type ShiftPlanningSavedDraftsListProps = {
  drafts: SavedDraftSummary[];
  loading: boolean;
  errorMessage: string | null;
  selectedDraftId: number | string | null;
  openingDraftId: number | string | null;
  deletingDraftId: number | string | null;
  draftStatusFilter: DraftStatusFilter;
  setDraftStatusFilter: Dispatch<SetStateAction<DraftStatusFilter>>;
  showAllDrafts: boolean;
  setShowAllDrafts: Dispatch<SetStateAction<boolean>>;
  onDeleteDraft: (draft: SavedDraftSummary) => void;
  onOpenDraft: (draftId: number | string) => void;
};

export type { DraftStatusFilter };

export function ShiftPlanningSavedDraftsList({
  drafts,
  loading,
  errorMessage,
  selectedDraftId,
  openingDraftId,
  deletingDraftId,
  draftStatusFilter,
  setDraftStatusFilter,
  showAllDrafts,
  setShowAllDrafts,
  onDeleteDraft,
  onOpenDraft,
}: ShiftPlanningSavedDraftsListProps) {
  const filterOptions = getDraftStatusFilterOptions(drafts);
  const filteredDrafts = drafts.filter((draft) =>
    draftMatchesStatusFilter(draft, draftStatusFilter),
  );
  const prioritizedDrafts = getPrioritizedSavedDrafts(filteredDrafts);
  const visibleDrafts = getVisibleSavedDrafts(prioritizedDrafts, showAllDrafts);
  const hiddenDraftCount = getHiddenSavedDraftCount(
    prioritizedDrafts,
    visibleDrafts,
  );
  const canToggleDraftList = prioritizedDrafts.length > MAX_VISIBLE_SAVED_DRAFTS;
  const selectedFilterText = formatSelectedDraftFilterText(draftStatusFilter);

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
        hasMatchingDrafts={prioritizedDrafts.length > 0}
        loading={loading}
        selectedFilterText={selectedFilterText}
      />

      {!loading && visibleDrafts.length > 0 && (
        <div className="space-y-3">
          {visibleDrafts.map((draft) => (
            <ShiftPlanningSavedDraftCard
              key={draft.id}
              draft={draft}
              isSelected={String(selectedDraftId ?? "") === String(draft.id)}
              openingDraftId={openingDraftId}
              deletingDraftId={deletingDraftId}
              onDeleteDraft={onDeleteDraft}
              onOpenDraft={onOpenDraft}
            />
          ))}
        </div>
      )}

      {canToggleDraftList && (
        <ShiftPlanningSavedDraftsTogglePanel
          filteredDraftCount={prioritizedDrafts.length}
          hiddenDraftCount={hiddenDraftCount}
          selectedFilterText={selectedFilterText}
          showAllDrafts={showAllDrafts}
          onToggle={() => setShowAllDrafts((current) => !current)}
        />
      )}
    </>
  );
}
