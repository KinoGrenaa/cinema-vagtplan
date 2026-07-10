import {
  getDaySummaryParts,
  getEntryDayKey,
  getEntryDayLabel,
  getEntryHoursNumber,
} from "./myTimeEntries";

type MyTimeSummaryEntry = {
  id: number;
  clockIn: string;
  clockOut?: string | null;
  status: "PENDING" | "NEEDS_CHANGES" | "APPROVED" | "VOIDED";
  note?: string | null;
  clockInNote?: string | null;
  clockOutNote?: string | null;
  adminNote?: string | null;
  payrollType?: {
    name: string;
  } | null;
  shift?: {
    workType?: {
      name: string;
    } | null;
  } | null;
};

export type MyTimeDayGroup<TEntry extends MyTimeSummaryEntry> = {
  dayKey: string;
  label: string;
  entries: TEntry[];
  summaryParts: string[];
};

export function getApprovedHours(entries: MyTimeSummaryEntry[]) {
  return entries.reduce((total, entry) => {
    if (entry.status !== "APPROVED") return total;

    return total + getEntryHoursNumber(entry);
  }, 0);
}

export function getPendingHours(entries: MyTimeSummaryEntry[]) {
  return entries.reduce((total, entry) => {
    if (entry.status !== "PENDING") return total;

    return total + getEntryHoursNumber(entry);
  }, 0);
}

export function getNeedsChangesCount(entries: MyTimeSummaryEntry[]) {
  return entries.filter((entry) => entry.status === "NEEDS_CHANGES").length;
}

export function getMyTimeDayGroups<TEntry extends MyTimeSummaryEntry>(
  visibleEntries: TEntry[],
): MyTimeDayGroup<TEntry>[] {
  return Array.from(
    visibleEntries.reduce((groups, entry) => {
      const dayKey = getEntryDayKey(entry);
      const existingGroup = groups.get(dayKey);

      if (existingGroup) {
        existingGroup.entries.push(entry);
        return groups;
      }

      groups.set(dayKey, {
        dayKey,
        label: getEntryDayLabel(dayKey),
        entries: [entry],
        summaryParts: [],
      });

      return groups;
    }, new Map<string, MyTimeDayGroup<TEntry>>()),
  )
    .map(([, group]) => ({
      ...group,
      summaryParts: getDaySummaryParts(group.entries),
    }))
    .sort((a, b) => b.dayKey.localeCompare(a.dayKey));
}
