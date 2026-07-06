import {
  compareSavedDraftAttentionPriority,
  hasSavedDraftAttention,
} from "./shiftPlanningSavedDraftAttention";
import type { SavedDraftSummary } from "./shiftPlanningDraftTypes";

export type DraftStatusFilter =
  | "ALL"
  | "DRAFT"
  | "PUBLISHED"
  | "SUPERSEDED"
  | "OTHER";

export type DraftStatusFilterOption = {
  value: DraftStatusFilter;
  label: string;
  count: number;
  attentionCount: number;
};

export type HiddenSavedDraftSummary = {
  count: number;
  attentionCount: number;
};

export const DRAFT_STATUS_FILTERS: Array<{
  value: DraftStatusFilter;
  label: string;
}> = [
  { value: "ALL", label: "Alle" },
  { value: "DRAFT", label: "Åbne" },
  { value: "PUBLISHED", label: "Oprettede" },
  { value: "SUPERSEDED", label: "Erstattede" },
  { value: "OTHER", label: "Andre/afsluttede" },
];

export const MAX_VISIBLE_SAVED_DRAFTS = 5;

function getDraftStatusFilterValue(status?: string | null): DraftStatusFilter {
  if (status === "DRAFT" || status === "PUBLISHED" || status === "SUPERSEDED") {
    return status;
  }

  return "OTHER";
}

export function draftMatchesStatusFilter(
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

function getDraftStatusAttentionCount(
  drafts: SavedDraftSummary[],
  filter: DraftStatusFilter,
) {
  return drafts.filter(
    (draft) =>
      draftMatchesStatusFilter(draft, filter) && hasSavedDraftAttention(draft),
  ).length;
}

export function getDraftStatusFilterOptions(
  drafts: SavedDraftSummary[],
): DraftStatusFilterOption[] {
  return DRAFT_STATUS_FILTERS.map((filter) => ({
    ...filter,
    count: getDraftStatusCount(drafts, filter.value),
    attentionCount: getDraftStatusAttentionCount(drafts, filter.value),
  }));
}

export function formatSelectedDraftFilterText(filter: DraftStatusFilter) {
  switch (filter) {
    case "DRAFT":
      return "åbne forslag";
    case "PUBLISHED":
      return "oprettede forslag";
    case "SUPERSEDED":
      return "erstattede forhåndsvisninger";
    case "OTHER":
      return "andre eller annullerede forhåndsvisninger";
    default:
      return "forhåndsvisninger";
  }
}

export function getPrioritizedSavedDrafts(filteredDrafts: SavedDraftSummary[]) {
  return filteredDrafts
    .map((draft, index) => ({ draft, index }))
    .sort((firstDraft, secondDraft) => {
      const attentionPriority = compareSavedDraftAttentionPriority(
        firstDraft.draft,
        secondDraft.draft,
      );

      if (attentionPriority !== 0) {
        return attentionPriority;
      }

      return firstDraft.index - secondDraft.index;
    })
    .map(({ draft }) => draft);
}

export function getVisibleSavedDrafts(
  filteredDrafts: SavedDraftSummary[],
  showAllDrafts: boolean,
) {
  if (showAllDrafts) {
    return filteredDrafts;
  }

  return filteredDrafts.slice(0, MAX_VISIBLE_SAVED_DRAFTS);
}

export function getHiddenSavedDraftCount(
  filteredDrafts: SavedDraftSummary[],
  visibleDrafts: SavedDraftSummary[],
) {
  return Math.max(0, filteredDrafts.length - visibleDrafts.length);
}

export function getHiddenSavedDraftSummary(
  filteredDrafts: SavedDraftSummary[],
  visibleDrafts: SavedDraftSummary[],
): HiddenSavedDraftSummary {
  const visibleDraftIds = new Set(
    visibleDrafts.map((draft) => String(draft.id ?? "")),
  );

  const hiddenDrafts = filteredDrafts.filter(
    (draft) => !visibleDraftIds.has(String(draft.id ?? "")),
  );

  return {
    count: hiddenDrafts.length,
    attentionCount: hiddenDrafts.filter(hasSavedDraftAttention).length,
  };
}
