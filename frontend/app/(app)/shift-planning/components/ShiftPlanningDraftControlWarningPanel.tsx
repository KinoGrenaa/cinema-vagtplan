type ShiftPlanningDraftControlWarningPanelProps = {
  draftNeedsControl: boolean;
};

export function ShiftPlanningDraftControlWarningPanel({
  draftNeedsControl,
}: ShiftPlanningDraftControlWarningPanelProps) {
  return (
    <div
      className={`mt-4 rounded-2xl border p-4 text-sm ${
        draftNeedsControl
          ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
          : "border-green-200 bg-green-50 text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100"
      }`}
    >
      <p className="font-semibold">
        {draftNeedsControl
          ? "Kræver kontrol før publicering"
          : "Ingen synlige kontroladvarsler i kladden"}
      </p>
      <p className="mt-1 opacity-85">
        {draftNeedsControl
          ? "Ret eller godkend afvigelserne bevidst, før kladden publiceres til den rigtige vagtplan."
          : "Kladden ser umiddelbart klar ud til publicering, når backend-valideringen og publiceringspreview også er grønne."}
      </p>
    </div>
  );
}
