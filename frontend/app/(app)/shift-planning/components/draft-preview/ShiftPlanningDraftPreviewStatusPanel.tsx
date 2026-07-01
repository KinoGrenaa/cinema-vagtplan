import type { PreparedDraftSummary } from "../ShiftPlanningDraftPreview";

type ShiftPlanningDraftPreviewStatusPanelProps = {
  latestDraft: PreparedDraftSummary | null;
  loading: boolean;
  rowCount: number;
};

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export function ShiftPlanningDraftPreviewStatusPanel({
  latestDraft,
  loading,
  rowCount,
}: ShiftPlanningDraftPreviewStatusPanelProps) {
  return (
    <>
      {latestDraft && (
        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-900/70 dark:bg-green-950/30 dark:text-green-100">
          Seneste kladde #{latestDraft.id} · {toNumber(latestDraft.itemCount)} poster ·{" "}
          {toNumber(latestDraft.unassignedItemCount)} uden standardmedarbejder ·{" "}
          {toNumber(latestDraft.warningItemCount)} med advarsel
        </div>
      )}

      {loading && (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-950/50 dark:text-gray-300">
          Henter kladdepreview...
        </div>
      )}

      {!loading && rowCount === 0 && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
          Ingen aktive dage har vagtsskabelon endnu. Læg først skabeloner på
          datoer, før måneden kan forberedes til kladder.
        </div>
      )}
    </>
  );
}
