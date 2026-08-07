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
  const panelClasses = canOpenConfirm
    ? "border-green-200 bg-green-50 text-green-950 dark:border-green-900/70 dark:bg-green-950/35 dark:text-green-100"
    : "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-100";
  const title = canOpenConfirm
    ? "Klar til at oprette vagter"
    : "Oprettelsen venter";
  const description = canOpenConfirm
    ? "Kontrollen og oprettelsesoverblikket er godkendt. Klik for at åbne den sidste bekræftelse."
    : blockedReason ?? "Kør den samlede kontrol, før vagterne oprettes.";

  return (
    <div className={`mt-4 rounded-2xl border p-4 text-sm transition-colors ${panelClasses}`}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 opacity-90">{description}</p>
      <button
        type="button"
        onClick={onOpenConfirm}
        disabled={!canOpenConfirm}
        className="mt-4 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
