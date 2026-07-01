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
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="font-semibold">Publicering opretter rigtige vagter.</p>
        <p className="mt-1 opacity-85">
          Kør kun dette, når kladden er gennemgået, publiceringspreviewet er
          grønt, og arbejdstypen er korrekt.
        </p>
      </div>

      <button
        type="button"
        onClick={onPublish}
        disabled={!canSubmitPublish}
        className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {publishing
          ? "Publicerer..."
          : selectedDraftIsPublished
            ? "Kladde er publiceret"
            : "Publicer kladde"}
      </button>
    </div>
  );
}
