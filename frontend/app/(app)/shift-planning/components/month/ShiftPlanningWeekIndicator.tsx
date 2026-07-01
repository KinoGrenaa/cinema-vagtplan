type ShiftPlanningWeekIndicatorProps = {
  weekNumber: number | null;
  weekParityLabel: string;
  activeDays: number;
  daysWithTemplate: number;
  missingTemplateDays: number;
};

export default function ShiftPlanningWeekIndicator({
  weekNumber,
  weekParityLabel,
  activeDays,
  daysWithTemplate,
  missingTemplateDays,
}: ShiftPlanningWeekIndicatorProps) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100 sm:col-span-2 lg:col-span-1 lg:min-h-44">
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
        Uge
      </p>
      <p className="mt-1 text-2xl font-bold">{weekNumber ?? "?"}</p>
      <p className="text-sm font-semibold">{weekParityLabel}</p>

      <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[11px] font-semibold lg:grid-cols-1 lg:text-left">
        <span className="rounded-lg bg-white/70 px-2 py-1 dark:bg-black/20">
          {activeDays} aktive dage
        </span>
        <span className="rounded-lg bg-white/70 px-2 py-1 dark:bg-black/20">
          {daysWithTemplate} med vagtsskabelon
        </span>
        <span className="rounded-lg bg-white/70 px-2 py-1 dark:bg-black/20">
          {missingTemplateDays} mangler planlægning
        </span>
      </div>
    </div>
  );
}
