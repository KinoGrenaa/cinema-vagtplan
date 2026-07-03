type ShiftPlanningPublishActionPanelProps = {
  canSubmitPublish: boolean;
  onPublish: () => void;
  publishing: boolean;
  selectedDraftIsPublished: boolean;
};

export function ShiftPlanningPublishActionPanel({
  canSubmitPublish,
  onPublish,
  publishing,
  selectedDraftIsPublished,
}: ShiftPlanningPublishActionPanelProps) {
  const buttonLabel = publishing
    ? "Opretter vagter..."
    : selectedDraftIsPublished
      ? "Vagter er oprettet"
      : "Publicer planlægningskladde";

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">Publicering opretter vagter i vagtplanen</p>
      <p className="mt-1">
        Kør kun publicering, når forhÅndsvisningen er gennemgået, oprettelsesoverblikket er
        grønt, og arbejdstypen er korrekt. Systemet blokerer også
        dobbeltpublicering, så samme kladde ikke kan oprette dubletvagter.
      </p>
      <button
        type="button"
        onClick={onPublish}
        disabled={!canSubmitPublish}
        className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
