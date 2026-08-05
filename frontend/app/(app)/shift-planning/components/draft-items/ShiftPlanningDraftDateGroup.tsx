import { useState } from "react";

import { ShiftPlanningDraftItemCard } from "./ShiftPlanningDraftItemCard";
import { getPrioritizedDraftItems } from "../../helpers/shiftPlanningDraftItemPriority";
import type { DraftDateGroup } from "../../helpers/shiftPlanningDraftTypes";

type ShiftPlanningDraftDateGroupProps = {
  attention?: boolean;
  group: DraftDateGroup;
  initiallyExpanded?: boolean;
};

export function ShiftPlanningDraftDateGroup({
  attention = false,
  group,
  initiallyExpanded = false,
}: ShiftPlanningDraftDateGroupProps) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const prioritizedItemsForDay = getPrioritizedDraftItems(group.items);
  const hasSpecificAttentionCount =
    group.warningCount > 0 || group.missingTimeCount > 0;

  return (
    <section
      className={`rounded-2xl border p-4 text-gray-900 shadow-sm ${
        attention
          ? "border-amber-300 bg-amber-50/70 dark:border-amber-900/70 dark:bg-amber-950/25 dark:text-gray-100"
          : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-base font-bold">{group.label}</h4>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {group.items.length} vagter
          </p>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900"
        >
          {expanded ? "Skjul vagter" : "Vis vagter"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        {group.unassignedCount > 0 && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
            {group.unassignedCount} uden medarbejder
          </span>
        )}

        {group.warningCount > 0 && (
          <span className="rounded-full bg-red-100 px-3 py-1 text-red-900 dark:bg-red-950/60 dark:text-red-200">
            {group.warningCount} advarsler
          </span>
        )}

        {group.missingTimeCount > 0 && (
          <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200">
            {group.missingTimeCount} mangler tid
          </span>
        )}

        {attention && !hasSpecificAttentionCount && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
            Kræver kontrol
          </span>
        )}
      </div>

      {expanded && (
        <div className="mt-4 space-y-3">
          {prioritizedItemsForDay.map((item) => (
            <ShiftPlanningDraftItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
