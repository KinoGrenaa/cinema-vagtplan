type ShiftPlanningDraftControlHeaderProps = {
  draftId: number | string;
  draftStatus?: string | null;
  isLoadingPublicationPreview: boolean;
  isValidating: boolean;
  onClose: () => void;
  onLoadPublicationPreview: () => Promise<void>;
  onValidate: () => Promise<boolean>;
  totalItems: number;
};

function formatDraftStatus(status?: string | null) {
  switch (status) {
    case "DRAFT":
      return "Åben forhåndsvisning";
    case "SUPERSEDED":
      return "Erstattet";
    case "PUBLISHED":
      return "Oprettet";
    case "CANCELLED":
      return "Annulleret";
    default:
      return status || "Ukendt status";
  }
}

function getStatusClasses(status?: string | null) {
  if (status === "DRAFT") {
    return "bg-green-100 text-green-900 ring-green-200 dark:bg-green-950/60 dark:text-green-200 dark:ring-green-900";
  }
  if (status === "SUPERSEDED") {
    return "bg-gray-100 text-gray-700 ring-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-800";
  }
  if (status === "PUBLISHED") {
    return "bg-blue-100 text-blue-900 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:ring-blue-900";
  }
  return "bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:ring-amber-900";
}

export function ShiftPlanningDraftControlHeader({
  draftId,
  draftStatus,
  isLoadingPublicationPreview,
  isValidating,
  onClose,
  onLoadPublicationPreview,
  onValidate,
  totalItems,
}: ShiftPlanningDraftControlHeaderProps) {
  const isRunningControl = isValidating || isLoadingPublicationPreview;

  const runControlAndLoadPreview = async () => {
    const validationCompleted = await onValidate();

    if (validationCompleted) {
      await onLoadPublicationPreview();
    }
  };

  const controlButtonLabel = isValidating
    ? "Kontrollerer..."
    : isLoadingPublicationPreview
      ? "Henter vagter..."
      : "Kontrollér og vis vagter";

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">
          Kontrol før oprettelse
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h3 className="text-xl font-bold text-gray-950 dark:text-white">
            Forhåndsvisning #{draftId} · {totalItems} vagter
          </h3>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getStatusClasses(
              draftStatus,
            )}`}
          >
            {formatDraftStatus(draftStatus)}
          </span>
        </div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Kør den samlede kontrol for både at kontrollere kladden og se præcis,
          hvilke vagter der kan oprettes.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void runControlAndLoadPreview()}
          className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-200 disabled:text-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:bg-blue-950 dark:disabled:text-blue-400"
          disabled={isRunningControl}
        >
          {controlButtonLabel}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
        >
          Luk kontrol
        </button>
      </div>
    </div>
  );
}
