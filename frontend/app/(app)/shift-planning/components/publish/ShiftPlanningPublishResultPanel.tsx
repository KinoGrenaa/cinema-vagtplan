import {
  formatAffectedDateLabels,
  formatCreatedShiftIds,
  toNumber,
} from "../../helpers/shiftPlanningDraftHelpers";
import type { DraftPublishResult } from "../../helpers/shiftPlanningDraftTypes";

type ShiftPlanningPublishResultPanelProps = {
  publishResult: DraftPublishResult;
  selectedWorkTypeName: string;
};

export function ShiftPlanningPublishResultPanel({
  publishResult,
  selectedWorkTypeName,
}: ShiftPlanningPublishResultPanelProps) {
  const publishedShiftIdsText = formatCreatedShiftIds(
    publishResult.createdShiftIds,
  );
  const publishedAffectedDateLabels = formatAffectedDateLabels(
    publishResult.affectedDateKeys,
  );

  return (
    <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-semibold">
            {publishResult.message || "Planlægningskladden er publiceret."}
          </p>
          <p className="mt-1 opacity-85">
            Oprettede vagter: {toNumber(publishResult.createdShiftCount)} ·
            Arbejdstype: {" "}
            {publishResult.workTypeName || selectedWorkTypeName}
          </p>

          {publishedShiftIdsText && (
            <p className="mt-1 text-xs opacity-75">
              Shift-id'er: {publishedShiftIdsText}
            </p>
          )}

          {publishedAffectedDateLabels.length > 0 && (
            <div className="mt-3 rounded-2xl border border-green-200 bg-white/65 p-3 dark:border-green-900/70 dark:bg-green-950/30">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-75">
                Opdaterede datoer i månedsplanen
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                {publishedAffectedDateLabels.map((date) => (
                  <span
                    key={date.dateKey}
                    className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-950 dark:bg-green-900/70 dark:text-green-100"
                  >
                    {date.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="mt-2 text-xs font-semibold opacity-80">
            Listen er skiftet til Publicerede kladder, så den publicerede
            kladde kan kontrolleres med det samme.
          </p>
        </div>

        <a
          href="/schedule"
          className="inline-flex w-fit rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 dark:bg-green-200 dark:text-green-950 dark:hover:bg-green-100"
        >
          Åbn vagtplan
        </a>
      </div>
    </div>
  );
}
