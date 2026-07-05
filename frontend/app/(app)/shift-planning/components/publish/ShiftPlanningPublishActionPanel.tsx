type ShiftPlanningPublishActionPanelProps = {
  blockedReason: string | null;
  canOpenConfirm: boolean;
  onOpenConfirm: () => void;
  publishing: boolean;
  selectedDraftIsPublished: boolean;
};

export function ShiftPlanningPublishActionPanel({
  blockedReason,
  canOpenConfirm,
  onOpenConfirm,
  publishing,
  selectedDraftIsPublished,
}: ShiftPlanningPublishActionPanelProps) {
  const buttonLabel = publishing
    ? "Opretter vagter..."
    : selectedDraftIsPublished
      ? "Vagter er oprettet"
      : "Opret vagter";

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">Opret vagter i vagtplanen</p>
      <p className="mt-1">
        Knappen åbner en bekræftelse, før noget oprettes. Hvis der mangler
        kontrol eller vagtoverblik, viser bekræftelsen hvad der mangler.
        Arbejdstype vælges på jobfunktionen.
      </p>
      <button
        type="button"
        onClick={onOpenConfirm}
        disabled={!canOpenConfirm}
        className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
      >
        {buttonLabel}
      </button>
      {!canOpenConfirm && blockedReason && (
        <p className="mt-2 text-xs font-semibold text-amber-950 dark:text-amber-100">
          {blockedReason}
        </p>
      )}
    </div>
  );
}
