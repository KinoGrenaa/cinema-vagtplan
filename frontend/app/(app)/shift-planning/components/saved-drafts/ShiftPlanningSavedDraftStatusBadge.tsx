type ShiftPlanningSavedDraftStatusBadgeProps = {
  status?: string | null;
};

function formatDraftStatus(status?: string | null) {
  switch (status) {
    case "DRAFT":
      return "Kladde";
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

  return "bg-blue-100 text-blue-900 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:ring-blue-900";
}

export function ShiftPlanningSavedDraftStatusBadge({
  status,
}: ShiftPlanningSavedDraftStatusBadgeProps) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${getStatusClasses(
        status,
      )}`}
    >
      {formatDraftStatus(status)}
    </span>
  );
}
