type ShiftPlanningSavedDraftStatusBadgeProps = {
  status?: string | null;
};

function formatDraftStatus(status?: string | null) {
  switch (status) {
    case "DRAFT":
      return "Åben";
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
  switch (status) {
    case "DRAFT":
      return "bg-green-100 text-green-900 ring-green-200 dark:bg-green-950/60 dark:text-green-200 dark:ring-green-900";
    case "PUBLISHED":
      return "bg-blue-100 text-blue-900 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:ring-blue-900";
    case "SUPERSEDED":
      return "bg-gray-100 text-gray-700 ring-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-800";
    case "CANCELLED":
      return "bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:ring-amber-900";
    default:
      return "bg-slate-100 text-slate-800 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800";
  }
}

export function ShiftPlanningSavedDraftStatusBadge({
  status,
}: ShiftPlanningSavedDraftStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getStatusClasses(
        status,
      )}`}
    >
      {formatDraftStatus(status)}
    </span>
  );
}
