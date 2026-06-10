import type { TimeEntryStatus } from "./types";

export function getStatusLabel(status: TimeEntryStatus) {
  if (status === "APPROVED") return "Godkendt";
  if (status === "REJECTED") return "Afvist";
  return "Afventer";
}

export function getStatusClass(status: TimeEntryStatus) {
  if (status === "APPROVED") {
    return "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-200";
  }

  if (status === "REJECTED") {
    return "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200";
  }

  return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200";
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("da-DK", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatMinutes(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";

  const sign = value > 0 ? "+" : "";
  return `${sign}${value} min`;
}

export async function readErrorMessage(response: Response, fallback: string) {
  try {
    const text = await response.text();

    if (!text) return fallback;

    try {
      const data = JSON.parse(text);

      if (typeof data?.message === "string") return data.message;

      if (Array.isArray(data?.message)) {
        return data.message.join(", ");
      }

      if (typeof data?.error === "string") return data.error;
    } catch {
      return text;
    }

    return fallback;
  } catch {
    return fallback;
  }
}
