import type { PreparedDraftSummary } from "./ShiftPlanningDraftPreview";
import {
  getPreparedDraftStatus,
  toPreparedDraftNumber,
} from "../../helpers/shiftPlanningPreparedDraftStatus";

type ShiftPlanningDraftPreviewStatusPanelProps = {
  latestDraft: PreparedDraftSummary | null;
  loading: boolean;
  rowCount: number;
};

const statusClasses = {
  attention:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100",
  ready:
    "border-green-200 bg-green-50 text-green-900 dark:border-green-900/70 dark:bg-green-950/30 dark:text-green-100",
};

const badgeClasses = {
  attention:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-100",
  ready:
    "bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-100",
};

export function ShiftPlanningDraftPreviewStatusPanel({
  latestDraft,
  loading,
  rowCount,
}: ShiftPlanningDraftPreviewStatusPanelProps) {
  const latestDraftStatus = latestDraft
    ? getPreparedDraftStatus(latestDraft)
    : null;

  return (
    <>
      {latestDraft && latestDraftStatus && (
        <div
          className={`mt-4 rounded-2xl border p-4 text-sm ${statusClasses[latestDraftStatus.tone]}`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide">
                {latestDraftStatus.badgeText}
              </p>
              <p className="mt-1 font-semibold">{latestDraftStatus.title}</p>
            </div>
            <span
              className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${badgeClasses[latestDraftStatus.tone]}`}
            >
              {toPreparedDraftNumber(latestDraft.itemCount)} vagter ·{" "}
              {toPreparedDraftNumber(latestDraft.unassignedItemCount)} uden
              standard · {toPreparedDraftNumber(latestDraft.warningItemCount)}
              {" "}med kontroladvarsel
            </span>
          </div>
          <p className="mt-3">{latestDraftStatus.description}</p>
          <p className="mt-2 font-medium">
            Næste trin: {latestDraftStatus.nextStep}
          </p>
        </div>
      )}

      {loading && (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-950/50 dark:text-gray-300">
          Henter grundlaget for månedens vagtforslag...
        </div>
      )}

      {!loading && rowCount === 0 && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
          Ingen aktive dage har vagtsskabelon endnu. Læg først skabeloner på
          datoer, før måneden kan forberedes til oprettelse.
        </div>
      )}
    </>
  );
}
