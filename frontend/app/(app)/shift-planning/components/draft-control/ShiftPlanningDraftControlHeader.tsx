type ShiftPlanningDraftControlHeaderProps = {
  draftId: number | string;
  draftStatus?: string | null;
  isLoadingPublicationPreview: boolean;
  isValidating: boolean;
  onClose: () => void;
  onLoadPublicationPreview: () => void;
  onValidate: () => void;
  totalItems: number;
};

function formatDraftStatus(status?: string | null) {
  switch (status) {
    case "DRAFT":
      return "Åben forhåndsvisning";
    case "SUPERSEDED":
      return "Erstattet";
    case "PUBLISHED":
      return "Publiceret";
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
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">
          Kontrol før oprettelse
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h3 className="text-xl font-bold text-gray-950 dark:text-white">
            Forhåndsvisning #{draftId} · {totalItems} poster
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
          Gennemgå poster, medarbejdere, tider, backend-validering og
          publiceringspreview. Publicering kræver stadig arbejdstype og præcis
          bekræftelse.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onValidate}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          disabled={isValidating}
        >
          {isValidating ? "Kontrollerer..." : "Kør backend-kontrol"}
        </button>
        <button
          type="button"
          onClick={onLoadPublicationPreview}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white"
          disabled={isLoadingPublicationPreview}
        >
          {isLoadingPublicationPreview
            ? "Henter preview..."
            : "Forhåndsvis oprettelse"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-100 dark:border-blue-800 dark:text-blue-100 dark:hover:bg-blue-900/40"
        >
          Luk kontrol
        </button>
      </div>
    </div>
  );
}
