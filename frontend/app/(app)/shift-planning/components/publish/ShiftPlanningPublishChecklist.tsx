import type { ShiftPlanningPublishReadiness } from "../../helpers/shiftPlanningPublishReadiness";

type ShiftPlanningPublishChecklistProps = {
  readiness: ShiftPlanningPublishReadiness;
};

type PublishChecklistItemProps = {
  complete: boolean;
  description: string;
  label: string;
  nextAction: string | null;
};

function PublishChecklistItem({
  complete,
  description,
  label,
  nextAction,
}: PublishChecklistItemProps) {
  return (
    <div
      className={`rounded-2xl border p-3 text-sm ${
        complete
          ? "border-green-200 bg-green-50 text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100"
          : "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            complete
              ? "bg-green-600 text-white dark:bg-green-300 dark:text-green-950"
              : "bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100"
          }`}
        >
          {complete ? "✓" : "–"}
        </span>
        <div>
          <p className="font-bold">{label}</p>
          <p className="mt-1 text-xs opacity-80">{description}</p>
          {!complete && nextAction && (
            <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold text-amber-950 dark:bg-black/20 dark:text-amber-100">
              Næste trin: {nextAction}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ShiftPlanningPublishChecklist({
  readiness,
}: ShiftPlanningPublishChecklistProps) {
  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/70">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-gray-950 dark:text-white">
            Klar til oprettelse
          </p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            Oprettelsen kræver, at forslaget stadig er åbent, og at
            vagtoverblikket er kontrolleret. Arbejdstype hentes automatisk fra
            jobfunktionerne.
          </p>
        </div>
        <span
          className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${
            readiness.allRequirementsMet
              ? "bg-green-100 text-green-950 dark:bg-green-900/70 dark:text-green-100"
              : "bg-amber-100 text-amber-950 dark:bg-amber-900/70 dark:text-amber-100"
          }`}
        >
          {readiness.statusLabel}
        </span>
      </div>

      {readiness.nextAction && (
        <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100">
          Næste trin: {readiness.nextAction}
        </p>
      )}

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {readiness.steps.map((step) => (
          <PublishChecklistItem
            key={step.id}
            complete={step.complete}
            description={step.description}
            label={step.label}
            nextAction={step.nextAction}
          />
        ))}
      </div>
    </div>
  );
}
