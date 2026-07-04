type ShiftPlanningPublishChecklistProps = {
  allRequirementsMet: boolean;
  creationOverviewIsGreen: boolean;
  statusIsDraft: boolean;
};

type PublishChecklistItemProps = {
  complete: boolean;
  description: string;
  label: string;
};

function PublishChecklistItem({
  complete,
  description,
  label,
}: PublishChecklistItemProps) {
  return (
    <div
      className={`rounded-2xl border p-3 text-sm ${
        complete
          ? "border-green-200 bg-green-50 text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100"
          : "border-gray-200 bg-white text-gray-700 dark:border-gray-800 dark:bg-gray-950/70 dark:text-gray-300"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            complete
              ? "bg-green-600 text-white dark:bg-green-300 dark:text-green-950"
              : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          {complete ? "✓" : "–"}
        </span>
        <div>
          <p className="font-bold">{label}</p>
          <p className="mt-1 text-xs opacity-80">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function ShiftPlanningPublishChecklist({
  allRequirementsMet,
  creationOverviewIsGreen,
  statusIsDraft,
}: ShiftPlanningPublishChecklistProps) {
  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/70">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-gray-950 dark:text-white">
            Klar til oprettelse
          </p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            Opret-knappen kan åbnes hele tiden. Selve oprettelsen kræver, at
            disse punkter er opfyldt. Arbejdstype hentes automatisk fra jobfunktionerne.
          </p>
        </div>
        <span
          className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${
            allRequirementsMet
              ? "bg-green-100 text-green-950 dark:bg-green-900/70 dark:text-green-100"
              : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          {allRequirementsMet ? "Klar" : "Mangler punkter"}
        </span>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <PublishChecklistItem
          complete={statusIsDraft}
          label="Forslag er åbent"
          description="Forslaget må ikke allerede være oprettet eller erstattet."
        />
        <PublishChecklistItem
          complete={creationOverviewIsGreen}
          label="Vagter er tjekket"
          description="Kontrollen og visningen af vagter skal være grøn."
        />
      </div>
    </div>
  );
}
