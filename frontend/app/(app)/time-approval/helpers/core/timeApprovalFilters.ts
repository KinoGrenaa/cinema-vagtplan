import type { TimeEntry } from "../../types";

export type TimeApprovalFilters = {
  employeeSearch: string;
  showPending: boolean;
  showNeedsChanges: boolean;
  showApproved: boolean;
  showVoided: boolean;
  showPlannedEntries: boolean;
  showManualEntries: boolean;
  onlyWithDeviations: boolean;
  onlyWithNotes: boolean;
  dateFrom: string;
  dateTo: string;
};

export function getVisibleEntries(
  entries: TimeEntry[],
  filters: TimeApprovalFilters,
) {
  return entries.filter((entry) => {
    if (!entry.clockIn || !entry.clockOut) return false;

    if (entry.status === "PENDING" && !filters.showPending) return false;

    if (entry.status === "NEEDS_CHANGES" && !filters.showNeedsChanges) {
      return false;
    }

    if (entry.status === "APPROVED" && !filters.showApproved) return false;
    if (entry.status === "VOIDED" && !filters.showVoided) return false;

    const isManualEntry = !entry.shift;

    if (isManualEntry && !filters.showManualEntries) return false;
    if (!isManualEntry && !filters.showPlannedEntries) return false;

    if (filters.onlyWithDeviations && !entry.deviation?.hasDeviation) {
      return false;
    }

    if (filters.onlyWithNotes && !hasEntryNote(entry)) return false;

    const entryDate = getEntryLocalDate(entry);

    if (filters.dateFrom && entryDate < filters.dateFrom) return false;
    if (filters.dateTo && entryDate > filters.dateTo) return false;

    const search = filters.employeeSearch.trim().toLowerCase();

    if (search) {
      const haystack =
        `${entry.user.firstName} ${entry.user.lastName} ${entry.user.email}`.toLowerCase();

      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}

export function getTimeApprovalStatusCounts(entries: TimeEntry[]) {
  return {
    pendingCount: entries.filter(
      (entry) => entry.clockIn && entry.clockOut && entry.status === "PENDING",
    ).length,
    approvedCount: entries.filter(
      (entry) => entry.clockIn && entry.clockOut && entry.status === "APPROVED",
    ).length,
    needsChangesCount: entries.filter(
      (entry) =>
        entry.clockIn && entry.clockOut && entry.status === "NEEDS_CHANGES",
    ).length,
    voidedCount: entries.filter(
      (entry) => entry.clockIn && entry.clockOut && entry.status === "VOIDED",
    ).length,
  };
}

export function getActiveFilterCount(filters: TimeApprovalFilters) {
  return [
    !filters.showPending,
    !filters.showNeedsChanges,
    filters.showApproved,
    filters.showVoided,
    !filters.showPlannedEntries,
    !filters.showManualEntries,
    filters.onlyWithDeviations,
    filters.onlyWithNotes,
    Boolean(filters.dateFrom),
    Boolean(filters.dateTo),
  ].filter(Boolean).length;
}

export function getGroupedEntries(visibleEntries: TimeEntry[]) {
  return Array.from(
    visibleEntries.reduce((groups, entry) => {
      const userKey = entry.user.email;
      const existingGroup = groups.get(userKey);

      if (existingGroup) {
        existingGroup.entries.push(entry);
      } else {
        groups.set(userKey, {
          user: entry.user,
          entries: [entry],
        });
      }
      return groups;
    }, new Map<string, { user: TimeEntry["user"]; entries: TimeEntry[] }>()),
  )
    .map(([userId, group]) => ({
      userId,
      ...group,
      pendingCount: group.entries.filter((entry) => entry.status === "PENDING")
        .length,
      needsChangesCount: group.entries.filter(
        (entry) => entry.status === "NEEDS_CHANGES",
      ).length,
      approvedCount: group.entries.filter(
        (entry) => entry.status === "APPROVED",
      ).length,
      voidedCount: group.entries.filter((entry) => entry.status === "VOIDED")
        .length,
      manualCount: group.entries.filter((entry) => !entry.shift).length,
      deviationCount: group.entries.filter(
        (entry) => entry.shift && entry.deviation?.hasDeviation,
      ).length,
    }))
    .sort((a, b) => {
      const nameA = `${a.user.firstName} ${a.user.lastName}`.toLowerCase();
      const nameB = `${b.user.firstName} ${b.user.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB, "da-DK");
    });
}

function hasEntryNote(entry: TimeEntry) {
  return Boolean(
    entry.clockInNote?.trim() ||
      entry.clockOutNote?.trim() ||
      entry.note?.trim() ||
      entry.adminNote?.trim(),
  );
}

function getEntryLocalDate(entry: TimeEntry) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Copenhagen",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(entry.clockIn));
}
