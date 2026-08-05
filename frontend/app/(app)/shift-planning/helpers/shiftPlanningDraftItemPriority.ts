import {
  itemHasJobFunction,
  itemHasTemplate,
  itemHasTime,
} from "./shiftPlanningDraftHelpers";
import type {
  DraftDateGroup,
  SavedDraftItem,
} from "./shiftPlanningDraftTypes";

function isDraftItemUnassigned(item: SavedDraftItem) {
  return !item.userFirstName && !item.userLastName && !item.userEmail;
}

function hasDraftItemWarning(item: SavedDraftItem) {
  return Boolean(item.warningCode || item.warningMessage);
}

export function draftItemNeedsAttention(item: SavedDraftItem) {
  return (
    hasDraftItemWarning(item) ||
    !itemHasTime(item) ||
    !itemHasJobFunction(item) ||
    !itemHasTemplate(item)
  );
}

export function draftDateGroupNeedsAttention(group: DraftDateGroup) {
  return group.items.some(draftItemNeedsAttention);
}

export function getDraftItemPriorityScore(item: SavedDraftItem) {
  let score = 0;

  if (hasDraftItemWarning(item)) {
    score += 10000;
  }

  if (!itemHasTime(item)) {
    score += 5000;
  }

  if (!itemHasJobFunction(item)) {
    score += 3000;
  }

  if (!itemHasTemplate(item)) {
    score += 2000;
  }

  if (isDraftItemUnassigned(item)) {
    score += 1000;
  }

  return score;
}

export function getPrioritizedDraftItems(items: SavedDraftItem[]) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((firstItem, secondItem) => {
      const priorityDifference =
        getDraftItemPriorityScore(secondItem.item) -
        getDraftItemPriorityScore(firstItem.item);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return firstItem.index - secondItem.index;
    })
    .map(({ item }) => item);
}

function getDraftDateGroupPriorityScore(group: DraftDateGroup) {
  const highestItemPriority = group.items.reduce(
    (highestPriority, item) =>
      Math.max(highestPriority, getDraftItemPriorityScore(item)),
    0,
  );

  return (
    highestItemPriority +
    group.warningCount * 100 +
    group.missingTimeCount * 50 +
    group.unassignedCount * 10
  );
}

export function getPrioritizedDraftDateGroups(groups: DraftDateGroup[]) {
  return groups
    .map((group, index) => ({ group, index }))
    .sort((firstGroup, secondGroup) => {
      const priorityDifference =
        getDraftDateGroupPriorityScore(secondGroup.group) -
        getDraftDateGroupPriorityScore(firstGroup.group);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return firstGroup.index - secondGroup.index;
    })
    .map(({ group }) => group);
}
