import type { TimeEntry } from "../../../../../shared/types";

export async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();

    if (typeof data?.message === "string") {
      return data.message;
    }
  } catch {}

  return fallback;
}

export function toInputDateTime(value: string) {
  const date = new Date(value);

  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 16);
}

export function calculateEntryHours(entry: TimeEntry) {
  if (!entry.clockOut) return "-";

  return (
    (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) /
    1000 /
    60 /
    60
  ).toFixed(2);
}

export function calculateTotalHours(entries: TimeEntry[]) {
  return entries.reduce((total, entry) => {
    if (!entry.clockOut) return total;

    const start = new Date(entry.clockIn);

    const end = new Date(entry.clockOut);

    return total + (end.getTime() - start.getTime()) / 1000 / 60 / 60;
  }, 0);
}
