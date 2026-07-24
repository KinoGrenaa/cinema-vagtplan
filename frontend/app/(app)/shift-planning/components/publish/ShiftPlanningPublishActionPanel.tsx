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
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 transition-colors dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-100">
      <p className="font-semibold">Opret vagter i vagtplanen</p>
      <p className="mt-1 text-amber-900 dark:text-amber-100/90">
        Knappen åbner en bekræftelse, før noget oprettes. Hvis der mangler
        kontrol eller vagtoverblik, viser bekræftelsen hvad der mangler.
        Arbejdstype vælges på jobfunktionen.
      </p>

      <button
        type="button"
        onClick={onOpenConfirm}
        disabled={!canOpenConfirm}
        className="mt-4 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
      >
        {buttonLabel}
      </button>

      {!canOpenConfirm && blockedReason && (
        <p className="mt-2 rounded-xl border border-amber-300 bg-white/60 px-3 py-2 text-xs font-semibold text-amber-950 dark:border-amber-800 dark:bg-black/20 dark:text-amber-100">
          {blockedReason}
        </p>
      )}
    </div>
  );
}
