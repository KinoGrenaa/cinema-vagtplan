import { toNumber } from "./shiftPlanningDraftHelpers";
import type { SavedDraftSummary } from "./shiftPlanningDraftTypes";

export type SavedDraftAttentionTone = "warning" | "info";

export type SavedDraftAttention = {
  title: string;
  message: string;
  tone: SavedDraftAttentionTone;
};

export type SavedDraftAttentionCounts = {
  itemCount: number;
  unassignedCount: number;
  warningCount: number;
};

export function getSavedDraftAttentionCounts(
  draft: SavedDraftSummary,
): SavedDraftAttentionCounts {
  return {
    itemCount: toNumber(draft.itemCount),
    unassignedCount: toNumber(draft.unassignedItemCount),
    warningCount: toNumber(draft.warningItemCount),
  };
}

function isOpenDraft(draft: SavedDraftSummary) {
  return String(draft.status ?? "").toUpperCase() === "DRAFT";
}

function formatWarningText(count: number) {
  return count === 1 ? "1 vagt har advarsel" : `${count} vagter har advarsler`;
}

function formatUnassignedText(count: number) {
  return count === 1
    ? "1 vagt mangler standardmedarbejder"
    : `${count} vagter mangler standardmedarbejder`;
}

export function getSavedDraftAttentionPriorityScore(draft: SavedDraftSummary) {
  if (!isOpenDraft(draft)) {
    return 0;
  }

  const { unassignedCount, warningCount } = getSavedDraftAttentionCounts(draft);

  if (warningCount <= 0 && unassignedCount <= 0) {
    return 0;
  }

  return warningCount * 1000 + unassignedCount;
}

export function hasSavedDraftAttention(draft: SavedDraftSummary) {
  return getSavedDraftAttentionPriorityScore(draft) > 0;
}

export function compareSavedDraftAttentionPriority(
  firstDraft: SavedDraftSummary,
  secondDraft: SavedDraftSummary,
) {
  return (
    getSavedDraftAttentionPriorityScore(secondDraft) -
    getSavedDraftAttentionPriorityScore(firstDraft)
  );
}

export function getSavedDraftAttention(
  draft: SavedDraftSummary,
): SavedDraftAttention | null {
  if (!isOpenDraft(draft)) {
    return null;
  }

  const { unassignedCount, warningCount } = getSavedDraftAttentionCounts(draft);

  if (warningCount > 0 && unassignedCount > 0) {
    return {
      title: "Kontrollér før oprettelse",
      message: `${formatWarningText(warningCount)}, og ${formatUnassignedText(
        unassignedCount,
      )}. Åbn forhåndsvisningen og kør kontrol, før vagterne oprettes.`,
      tone: "warning",
    };
  }

  if (warningCount > 0) {
    return {
      title: "Kontroladvarsler",
      message: `${formatWarningText(
        warningCount,
      )}. Åbn forhåndsvisningen og gennemgå advarslerne, før vagterne oprettes.`,
      tone: "warning",
    };
  }

  if (unassignedCount > 0) {
    return {
      title: "Mangler standardmedarbejder",
      message: `${formatUnassignedText(
        unassignedCount,
      )}. Åbn forhåndsvisningen og tjek bemandingen, før vagterne oprettes.`,
      tone: "info",
    };
  }

  return null;
}
