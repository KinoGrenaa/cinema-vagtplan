import { ShiftPlanningDraftItemCard } from "./ShiftPlanningDraftItemCard";
import type { DraftDateGroup } from "../../helpers/shiftPlanningDraftTypes";

type ShiftPlanningDraftDateGroupProps = {
  group: DraftDateGroup;
  maxVisibleItems: number;
};

export function ShiftPlanningDraftDateGroup({
  group,
  maxVisibleItems,
}: ShiftPlanningDraftDateGroupProps) {
  const visibleItemsForDay = group.items.slice(0, maxVisibleItems);
  const hiddenItemsForDay = Math.max(
    0,
    group.items.length - visibleItemsForDay.length,
  );

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-base font-bold text-gray-950 dark:text-white">
            {group.label}
          </h4>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {group.items.length} kladdeposter på datoen
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {group.unassignedCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-950 dark:bg-amber-950/60 dark:text-amber-100">
              {group.unassignedCount} uden medarbejder
            </span>
          )}
          {group.warningCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-950 dark:bg-amber-950/60 dark:text-amber-100">
              {group.warningCount} kontroladvarsler
            </span>
          )}
          {group.missingTimeCount > 0 && (
            <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-950 dark:bg-red-950/60 dark:text-red-100">
              {group.missingTimeCount} mangler tid
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {visibleItemsForDay.map((item) => (
          <ShiftPlanningDraftItemCard key={item.id} item={item} />
        ))}
      </div>

      {hiddenItemsForDay > 0 && (
        <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
          {hiddenItemsForDay} flere kladdeposter på datoen er skjult i denne kompakte visning.
        </p>
      )}
    </section>
  );
}
