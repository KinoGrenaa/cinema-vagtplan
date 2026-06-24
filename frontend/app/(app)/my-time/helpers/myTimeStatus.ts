export type TimeEntryStatus = "PENDING" | "NEEDS_CHANGES" | "APPROVED" | "VOIDED";

export type MyTimeStatusFilters = {
  approved: boolean;
  pending: boolean;
  needsChanges: boolean;
  voided: boolean;
};

export const DEFAULT_STATUS_FILTERS: MyTimeStatusFilters = {
  approved: true,
  pending: false,
  needsChanges: false,
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
    return "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-200";
  }

  if (status === "NEEDS_CHANGES") {
    return "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-200";
  }

  if (status === "VOIDED") {
    return "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200";
  }

  return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200";
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