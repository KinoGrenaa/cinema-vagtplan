import { ShiftPlanningDraftDateGroup } from "./ShiftPlanningDraftDateGroup";
import type { DraftDateGroup } from "../../helpers/shiftPlanningDraftTypes";

type ShiftPlanningDraftItemsByDateProps = {
  dateGroups: DraftDateGroup[];
};

const MAX_VISIBLE_DATE_GROUPS = 10;
const MAX_VISIBLE_ITEMS_PER_DAY = 6;

export function ShiftPlanningDraftItemsByDate({
  dateGroups,
}: ShiftPlanningDraftItemsByDateProps) {
  const visibleDateGroups = dateGroups.slice(0, MAX_VISIBLE_DATE_GROUPS);
  const hiddenDateGroupCount = Math.max(
    0,
    dateGroups.length - visibleDateGroups.length,
  );

  if (dateGroups.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
        Kladden har ingen poster.
      </div>
    );
  }

  return (
    <>
      <div className="mt-5 grid gap-4">
        {visibleDateGroups.map((group) => (
          <ShiftPlanningDraftDateGroup
            key={group.dateKey || group.label}
            group={group}
            maxVisibleItems={MAX_VISIBLE_ITEMS_PER_DAY}
          />
        ))}
      </div>

      {hiddenDateGroupCount > 0 && (
        <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
          {hiddenDateGroupCount} flere datoer er skjult i denne kompakte
          kontrolvisning.
        </p>
      )}
    </>
  );
}
