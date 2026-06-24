import { dateToLocalDateString } from "./myTimeDate";
import type { MyTimeStatusFilters, TimeEntryStatus } from "./myTimeStatus";

type MyTimeEntryHelperEntry = {
  clockIn: string;
  clockOut?: string | null;
  status: TimeEntryStatus;
};

export function getEntryHoursNumber(entry: MyTimeEntryHelperEntry) {
  if (!entry.clockOut) return 0;

  const start = new Date(entry.clockIn).getTime();
  const end = new Date(entry.clockOut).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return 0;
  }

  return (end - start) / 1000 / 60 / 60;
}

export function formatHoursDuration(hours: number) {
  const totalMinutes = Math.round(hours * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${wholeHours} t`;
  }

  return `${wholeHours} t ${String(minutes).padStart(2, "0")} min`;
}

export function getHours(entry: MyTimeEntryHelperEntry) {
  const hours = getEntryHoursNumber(entry);

  if (hours <= 0) return "-";

  return formatHoursDuration(hours);
}

export function getDaySummaryParts(entries: MyTimeEntryHelperEntry[]) {
  const approvedHours = entries.reduce((total, entry) => {
    if (entry.status !== "APPROVED") return total;
    return total + getEntryHoursNumber(entry);
  }, 0);

  const pendingHours = entries.reduce((total, entry) => {
    if (entry.status !== "PENDING") return total;
    return total + getEntryHoursNumber(entry);
  }, 0);

  const needsChangesCount = entries.filter(
    (entry) => entry.status === "NEEDS_CHANGES",
  ).length;

  const voidedCount = entries.filter(
    (entry) => entry.status === "VOIDED",
  ).length;

  return [
    approvedHours > 0
      ? `Godkendt: ${formatHoursDuration(approvedHours)}`
      : null,
    pendingHours > 0 ? `Afventer: ${formatHoursDuration(pendingHours)}` : null,
    needsChangesCount > 0 ? `Kræver handling: ${needsChangesCount}` : null,
    voidedCount > 0 ? `Afvist/annulleret: ${voidedCount}` : null,
  ].filter(Boolean) as string[];
}

export function isInPayrollPeriod(
  entry: Pick<MyTimeEntryHelperEntry, "clockIn">,
  startDate: string,
  endDate: string,
) {
  const entryDate = dateToLocalDateString(new Date(entry.clockIn));
  return entryDate >= startDate && entryDate <= endDate;
}

export function getEntryDayKey(entry: Pick<MyTimeEntryHelperEntry, "clockIn">) {
  return dateToLocalDateString(new Date(entry.clockIn));
}

export function getEntryDayLabel(dayKey: string) {
  return new Date(`${dayKey}T00:00:00`).toLocaleDateString("da-DK", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function isEntryVisibleWithStatusFilters(
  entry: Pick<MyTimeEntryHelperEntry, "status">,
  filters: MyTimeStatusFilters,
) {
  if (entry.status === "APPROVED") return filters.approved;
  if (entry.status === "PENDING") return filters.pending;
  if (entry.status === "NEEDS_CHANGES") return filters.needsChanges;
  if (entry.status === "VOIDED") return filters.voided;

  return false;
}
