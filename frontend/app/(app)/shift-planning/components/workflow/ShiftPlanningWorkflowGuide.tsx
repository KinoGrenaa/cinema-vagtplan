type ShiftPlanningWorkflowGuideProps = {
  hasSelectedDraft: boolean;
};

export default function ShiftPlanningWorkflowGuide({
  hasSelectedDraft,
}: ShiftPlanningWorkflowGuideProps) {
  const steps = [
    "Planlæg",
    "Ønsker",
    "Fordel",
    "Gennemse & udgiv",
  ] as const;

  return (
    <section
      aria-label="Arbejdsgang for vagtplanlægning"
      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-gray-950"
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Arbejdsgang
          </span>

          {steps.map((step, index) => {
            const active = hasSelectedDraft && index === 0;

            return (
              <div key={step} className="flex items-center gap-2">
                {index > 0 && (
                  <span
                    aria-hidden="true"
                    className="text-slate-400 dark:text-slate-600"
                  >
                    →
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${
                    active
                      ? "border-violet-400 bg-violet-100 text-violet-900 dark:border-violet-700 dark:bg-violet-950/70 dark:text-violet-100"
                      : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  }`}
                >
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                      active
                        ? "bg-violet-700 text-white dark:bg-violet-500"
                        : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {index + 1}
                  </span>
                  {step}
                  {active && (
                    <span className="ml-0.5 text-[10px] uppercase tracking-wide">
                      Nu
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300">
          {hasSelectedDraft
            ? "Du arbejder i kladden. Ønsker bliver valgfrit; vagter kan fortsat tildeles direkte."
            : "Vælg eller opret en kladde for at begynde planlægningen."}
        </p>
      </div>
    </section>
  );
}
