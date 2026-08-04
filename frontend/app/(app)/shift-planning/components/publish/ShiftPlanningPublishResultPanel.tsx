import {
  formatAffectedDateLabels,
  formatCreatedShiftIds,
  toNumber,
} from "../../helpers/shiftPlanningDraftHelpers";
import type { DraftPublishResult } from "../../helpers/shiftPlanningDraftTypes";

import { ShiftPlanningScheduleDateLinks } from "./ShiftPlanningScheduleDateLinks";

type ShiftPlanningPublishResultPanelProps = {
  publishResult: DraftPublishResult;
  selectedJobFunctionName: string;
};

export function ShiftPlanningPublishResultPanel({
  publishResult,
  selectedJobFunctionName,
}: ShiftPlanningPublishResultPanelProps) {
  const publishedShiftIdsText = formatCreatedShiftIds(
    publishResult.createdShiftIds,
  );
  const publishedAffectedDateLabels = formatAffectedDateLabels(
    publishResult.affectedDateKeys,
  );
  const createdShiftCount = toNumber(publishResult.createdShiftCount);
  const jobFunctionName = publishResult.jobFunctionName || selectedJobFunctionName;
  const firstAffectedDateKey = publishedAffectedDateLabels[0]?.dateKey ?? "";
  const scheduleHref = firstAffectedDateKey
    ? `/schedule?date=${firstAffectedDateKey}`
    : "/schedule";

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
      <p className="font-semibold">
        {publishResult.message || "Vagterne er oprettet."}
      </p>
      <p className="mt-1">
        Der er oprettet {createdShiftCount} rigtige vagter med jobfunktionn{" "}
        <span className="font-semibold">{jobFunctionName}</span>. Forslaget er nu
        låst mod ny oprettelse, så samme forslag ikke kan oprette dubletter.
      </p>

      {publishedShiftIdsText && (
        <p className="mt-2 text-xs text-emerald-800">
          Shift-id&apos;er: {publishedShiftIdsText}
        </p>
      )}

      <ShiftPlanningScheduleDateLinks dates={publishedAffectedDateLabels} />

      <p className="mt-3 text-xs text-emerald-800">
        Listen er skiftet til oprettede forslag, så den oprettede
        forhåndsvisning kan kontrolleres med det samme. Brug vagtplanen til at
        gennemgå de oprettede vagter på de berørte datoer.
      </p>

      <a
        href={scheduleHref}
        className="mt-3 inline-flex rounded-xl border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
      >
        {firstAffectedDateKey
          ? "Åbn vagtplan på første berørte dato"
          : "Åbn vagtplan"}
      </a>
    </div>
  );
}
