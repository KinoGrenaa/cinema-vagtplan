export type ShiftPlanningDraftPreviewPriorityRow = {
  dateKey: string;
  emptyCount: number;
  hasTemplateDay: boolean;
  requiredCount: number;
  warning: string | null;
};

function getDraftPreviewRowPriority(row: ShiftPlanningDraftPreviewPriorityRow) {
  if (!row.hasTemplateDay) {
    return 40;
  }

  if (row.warning) {
    return 30;
  }

  if (row.emptyCount > 0) {
    return 20;
  }

  if (row.requiredCount === 0) {
    return 10;
  }

  return 0;
}

export function hasDraftPreviewRowAttention(
  row: ShiftPlanningDraftPreviewPriorityRow,
) {
  return getDraftPreviewRowPriority(row) >= 20;
}

export function getDraftPreviewRowOpenActionLabel(
  row: ShiftPlanningDraftPreviewPriorityRow,
) {
  return hasDraftPreviewRowAttention(row) ? "Ret dato" : "Åbn dato";
}

export function getPrioritizedDraftPreviewRows<
  TRow extends ShiftPlanningDraftPreviewPriorityRow,
>(rows: TRow[]) {
  return rows
    .map((row, index) => ({
      index,
      priority: getDraftPreviewRowPriority(row),
      row,
    }))
    .sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.row);
}

export function getHiddenDraftPreviewAttentionCount<
  TRow extends ShiftPlanningDraftPreviewPriorityRow,
>(visibleRows: TRow[], allRows: TRow[]) {
  const visibleDateKeys = new Set(visibleRows.map((row) => row.dateKey));

  return allRows.filter(
    (row) =>
      !visibleDateKeys.has(row.dateKey) && hasDraftPreviewRowAttention(row),
  ).length;
}
