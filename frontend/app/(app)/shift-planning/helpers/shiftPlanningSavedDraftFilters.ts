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
};

export const DRAFT_STATUS_FILTERS: Array<{
  value: DraftStatusFilter;
  label: string;
}> = [
  { value: "ALL", label: "Alle" },
  { value: "DRAFT", label: "Åbne kladder" },
  { value: "PUBLISHED", label: "Publicerede" },
  { value: "SUPERSEDED", label: "Erstattede" },
  { value: "OTHER", label: "Andre/annullerede" },
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

export function getDraftStatusFilterOptions(
  drafts: SavedDraftSummary[],
): DraftStatusFilterOption[] {
  return DRAFT_STATUS_FILTERS.map((filter) => ({
    ...filter,
    count: getDraftStatusCount(drafts, filter.value),
  }));
}

export function formatSelectedDraftFilterText(filter: DraftStatusFilter) {
  switch (filter) {
    case "DRAFT":
      return "åbne kladder";
    case "PUBLISHED":
      return "publicerede oprettelser";
    case "SUPERSEDED":
      return "erstattede forhÃ¥ndsvisninger";
    case "OTHER":
      return "andre eller annullerede forhÃ¥ndsvisninger";
    default:
      return "forhÃ¥ndsvisninger";
  }
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
