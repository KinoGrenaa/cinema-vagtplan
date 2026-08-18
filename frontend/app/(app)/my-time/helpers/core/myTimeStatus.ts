export type TimeEntryStatus =
  | "PENDING"
  | "NEEDS_CHANGES"
  | "APPROVED"
  | "VOIDED";

export type MyTimeStatusFilters = {
  approved: boolean;
  pending: boolean;
  needsChanges: boolean;
  voided: boolean;
};

export const DEFAULT_STATUS_FILTERS: MyTimeStatusFilters = {
  approved: true,
  pending: true,
  needsChanges: true,
  voided: false,
};

export function getStatusLabel(status: TimeEntryStatus) {
  if (status === "APPROVED") return "Godkendt";
  if (status === "NEEDS_CHANGES") return "Skal rettes";
  if (status === "VOIDED") return "Afvist/annulleret";
  return "Afventer";
}

export function getStatusClass(status: TimeEntryStatus) {
  if (status === "APPROVED") {
    return "border-green-300 bg-green-50 text-gray-900 dark:border-green-900/70 dark:bg-green-950/25 dark:text-gray-100";
  }

  if (status === "NEEDS_CHANGES") {
    return "border-orange-300 bg-orange-50 text-gray-900 dark:border-orange-800 dark:bg-orange-950/25 dark:text-gray-100";
  }

  if (status === "VOIDED") {
    return "border-red-300 bg-red-50 text-gray-900 dark:border-red-900/70 dark:bg-red-950/25 dark:text-gray-100";
  }

  return "border-amber-300 bg-amber-50 text-gray-900 dark:border-amber-900/70 dark:bg-amber-950/25 dark:text-gray-100";
}

export function getStatusHistoryLabel(status?: string | null) {
  if (!status) return "-";

  switch (status) {
    case "PENDING":
      return "Afventer";
    case "APPROVED":
      return "Godkendt";
    case "NEEDS_CHANGES":
      return "Skal rettes";
    case "VOIDED":
      return "Afvist/annulleret";
    default:
      return status;
  }
}

export function getActiveStatusFilterCount(filters: MyTimeStatusFilters) {
  return Object.values(filters).filter(Boolean).length;
}

export function getStatusFilterSummary(filters: MyTimeStatusFilters) {
  const labels = [];

  if (filters.approved) labels.push("Godkendte");
  if (filters.pending) labels.push("Afventer");
  if (filters.needsChanges) labels.push("Skal rettes");
  if (filters.voided) labels.push("Afviste/annullerede");

  return labels.length > 0 ? labels.join(", ") : "Ingen statusser valgt";
}
