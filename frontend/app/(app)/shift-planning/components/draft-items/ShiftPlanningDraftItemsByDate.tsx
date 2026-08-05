import { ShiftPlanningDraftDateGroup } from "./ShiftPlanningDraftDateGroup";
import {
  draftDateGroupNeedsAttention,
  getPrioritizedDraftDateGroups,
} from "../../helpers/shiftPlanningDraftItemPriority";
import type { DraftDateGroup } from "../../helpers/shiftPlanningDraftTypes";

type ShiftPlanningDraftItemsByDateProps = {
  dateGroups: DraftDateGroup[];
};

export function ShiftPlanningDraftItemsByDate({
  dateGroups,
}: ShiftPlanningDraftItemsByDateProps) {
  const prioritizedDateGroups = getPrioritizedDraftDateGroups(dateGroups);
  const attentionDateGroups = prioritizedDateGroups.filter(
    draftDateGroupNeedsAttention,
  );
  const ordinaryDateGroups = prioritizedDateGroups.filter(
    (group) => !draftDateGroupNeedsAttention(group),
  );
  const attentionItemCount = attentionDateGroups.reduce(
    (sum, group) => sum + group.items.length,
    0,
  );
  const ordinaryItemCount = ordinaryDateGroups.reduce(
    (sum, group) => sum + group.items.length,
    0,
  );

  if (dateGroups.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
        Vagtforslaget har ingen vagter endnu. Beregn først månedens
        vagtforslag.
      </div>
    );
  }

  return (
    <section className="mt-5 space-y-4">
      <div>
        <h4 className="text-base font-bold text-gray-950 dark:text-white">
          Vagter i forslaget
        </h4>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Fejl, mangler og advarsler står åbne først. Almindelige vagter er
          samlet nedenunder.
        </p>
      </div>

      {attentionDateGroups.length > 0 ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-100">
            <span className="font-bold">Kræver opmærksomhed:</span>{" "}
            {attentionItemCount} vagter på {attentionDateGroups.length} datoer
          </div>

          {attentionDateGroups.map((group) => (
            <ShiftPlanningDraftDateGroup
              attention
              group={group}
              initiallyExpanded
              key={group.dateKey || group.label}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-950 dark:border-green-900/70 dark:bg-green-950/35 dark:text-green-100">
          Ingen vagter i forslaget har fejl eller kontroladvarsler.
        </div>
      )}

      {ordinaryDateGroups.length > 0 && (
        <details className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-gray-900 marker:hidden hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-900">
            Vis {ordinaryItemCount} almindelige vagter på{" "}
            {ordinaryDateGroups.length} datoer
          </summary>

          <div className="space-y-3 border-t border-gray-200 p-4 dark:border-gray-800">
            {ordinaryDateGroups.map((group) => (
              <ShiftPlanningDraftDateGroup
                group={group}
                key={group.dateKey || group.label}
              />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
