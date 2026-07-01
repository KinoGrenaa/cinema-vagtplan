type DraftControlSummary = {
  totalItems: number;
  dateCount: number;
  unassignedCount: number;
  warningCount: number;
  missingTimeCount: number;
  missingJobFunctionCount: number;
  missingTemplateCount: number;
};

type ShiftPlanningDraftControlSummaryProps = {
  backendValidationIsGreen: boolean;
  controlSummary: DraftControlSummary;
  draftNeedsControl: boolean;
  hasValidationError: boolean;
  hasValidationResult: boolean;
  isReadyForPublication: boolean;
};

function ControlMetricCard({
  label,
  value,
  variant = "neutral",
}: {
  label: string;
  value: number;
  variant?: "neutral" | "warning" | "success";
}) {
  const classes =
    variant === "warning" && value > 0
      ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
      : variant === "success"
        ? "border-green-200 bg-green-50 text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100"
        : "border-blue-200 bg-white text-blue-950 dark:border-blue-900/70 dark:bg-gray-950/70 dark:text-blue-100";

  return (
    <div className={`rounded-2xl border p-4 ${classes}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

export function ShiftPlanningDraftControlSummary({
  backendValidationIsGreen,
  controlSummary,
  draftNeedsControl,
  hasValidationError,
  hasValidationResult,
  isReadyForPublication,
}: ShiftPlanningDraftControlSummaryProps) {
  return (
    <>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <ControlMetricCard label="Poster" value={controlSummary.totalItems} />
        <ControlMetricCard label="Datoer" value={controlSummary.dateCount} />
        <ControlMetricCard
          label="Ikke tildelt"
          value={controlSummary.unassignedCount}
          variant="warning"
        />
        <ControlMetricCard
          label="Advarsler"
          value={controlSummary.warningCount}
          variant="warning"
        />
        <ControlMetricCard
          label="Tid mangler"
          value={controlSummary.missingTimeCount}
          variant="warning"
        />
        <ControlMetricCard
          label="Data mangler"
          value={
            controlSummary.missingJobFunctionCount +
            controlSummary.missingTemplateCount
          }
          variant="warning"
        />
      </div>

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

      <div
        className={`mt-4 rounded-2xl border p-4 text-sm ${
          isReadyForPublication
            ? "border-green-200 bg-green-50 text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100"
            : backendValidationIsGreen
              ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
              : "border-gray-200 bg-white text-gray-800 dark:border-gray-800 dark:bg-gray-950/70 dark:text-gray-200"
        }`}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
              Publiceringsklarhed
            </p>
            <p className="mt-2 text-base font-bold">
              {isReadyForPublication
                ? "Klar til publicering"
                : backendValidationIsGreen
                  ? "Backend-validering er grøn — gennemgå lokale kontroladvarsler"
                  : hasValidationResult
                    ? "Ikke klar til publicering"
                    : hasValidationError
                      ? "Ikke klar — backend-validering fejlede"
                      : "Ikke klar — kør backend-validering først"}
            </p>
            <p className="mt-1 opacity-85">
              {isReadyForPublication
                ? "Kladden har grøn backend-validering og ingen synlige lokale kontroladvarsler. Publicering er stadig låst bag preview, arbejdstype og præcis bekræftelse."
                : backendValidationIsGreen
                  ? "Backend fandt ingen fejl eller advarsler, men kladden har lokale kontrolpunkter, som bør gennemgås før publicering."
                  : hasValidationResult
                    ? "Backend-valideringen skal være grøn, før kladden må vises som klar til publicering."
                    : hasValidationError
                      ? "Ret fejlen eller prøv valideringen igen. Kladden kan ikke markeres klar uden en grøn backend-validering."
                      : "Klik på “Kør backend-validering”. En kladde kan først vises som klar, når backend-valideringen er kørt og er grøn."}
            </p>
          </div>
          <span
            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${
              isReadyForPublication
                ? "bg-green-100 text-green-950 dark:bg-green-900/60 dark:text-green-100"
                : backendValidationIsGreen
                  ? "bg-amber-100 text-amber-950 dark:bg-amber-900/60 dark:text-amber-100"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
            }`}
          >
            {isReadyForPublication
              ? "Klar"
              : backendValidationIsGreen
                ? "Kontrol"
                : "Blokeret"}
          </span>
        </div>
      </div>
    </>
  );
}
