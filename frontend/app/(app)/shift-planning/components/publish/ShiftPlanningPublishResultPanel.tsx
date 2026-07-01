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
  const createdShiftCount = toNumber(publishResult.createdShiftCount);
  const workTypeName = publishResult.workTypeName || selectedWorkTypeName;
  const firstAffectedDateKey =
    publishedAffectedDateLabels[0]?.dateKey ?? "";
  const scheduleHref = firstAffectedDateKey
    ? `/schedule?date=${firstAffectedDateKey}`
    : "/schedule";

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
      <p className="font-semibold">
        {publishResult.message || "Planlægningskladden er publiceret."}
      </p>
      <p className="mt-1">
        Der er oprettet {createdShiftCount} rigtige vagter med arbejdstypen{" "}
        <span className="font-semibold">{workTypeName}</span>. Kladden er nu
        låst mod ny publicering, så samme planlægningskladde ikke kan oprette dubletter.
      </p>

      {publishedShiftIdsText && (
        <p className="mt-2 text-xs text-emerald-800">
          Shift-id&apos;er: {publishedShiftIdsText}
        </p>
      )}

      {publishedAffectedDateLabels.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
            Opdaterede datoer i månedsplanen
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {publishedAffectedDateLabels.map((date) => (
              <span
                key={date.dateKey}
                className="rounded-full border border-emerald-300 bg-white px-2.5 py-1 text-xs font-medium text-emerald-900"
              >
                {date.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-emerald-800">
        Listen er skiftet til Publicerede planlægningskladder, så den publicerede kladde kan
        kontrolleres med det samme. Brug vagtplanen til at gennemgå de oprettede
        vagter på de berørte datoer.
      </p>
      <a
        href={scheduleHref}
        className="mt-3 inline-flex rounded-xl border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
      >
        Åbn vagtplan
      </a>
    </div>
  );
}
