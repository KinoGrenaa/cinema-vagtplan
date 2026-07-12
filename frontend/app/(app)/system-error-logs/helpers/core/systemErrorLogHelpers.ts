import type {
  SystemErrorLog,
  SystemErrorSeverity,
  SystemErrorStatus,
} from "../../types";

export function getQuickFilterButtonClass(active: boolean) {
  const baseClass =
    "rounded-xl border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60";

  if (active) {
    return `${baseClass} border-purple-700 bg-purple-700 text-white hover:bg-purple-800 dark:border-purple-500 dark:bg-purple-500 dark:hover:bg-purple-400`;
  }

  return `${baseClass} border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800`;
}

export async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as {
      message?: unknown;
      error?: unknown;
    };

    if (Array.isArray(data.message)) {
      const message = data.message
        .filter((item): item is string => typeof item === "string")
        .join(", ");

      return message || fallback;
    }

    if (typeof data.message === "string") {
      return data.message;
    }

    if (typeof data.error === "string") {
      return data.error;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const parts = new Intl.DateTimeFormat("da-DK", {
    timeZone: "Europe/Copenhagen",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.day ?? "--"}.${values.month ?? "--"}.${
    values.year ?? "----"
  } · kl. ${values.hour ?? "--"}:${values.minute ?? "--"}`;
}

function formatPersonName(
  firstName: string | null,
  lastName: string | null,
  email: string | null,
) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (name) {
    return name;
  }

  return email?.trim() || "";
}

export function formatUser(log: SystemErrorLog) {
  const personName = formatPersonName(
    log.userFirstName,
    log.userLastName,
    log.userEmail,
  );

  if (!log.userId && !log.userRole && !personName) {
    return "Ukendt bruger";
  }

  return [
    log.userRole,
    personName || null,
    log.userId ? `#${log.userId}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function formatCinema(log: SystemErrorLog) {
  if (log.cinemaName && log.cinemaId) {
    return `${log.cinemaName} · #${log.cinemaId}`;
  }

  if (log.cinemaName) {
    return log.cinemaName;
  }

  return log.cinemaId ? `Biograf #${log.cinemaId}` : "Global/ukendt";
}

export function formatResolvedBy(log: SystemErrorLog) {
  const personName = formatPersonName(
    log.resolvedByFirstName,
    log.resolvedByLastName,
    log.resolvedByEmail,
  );

  if (!log.resolvedByUserId && !personName) {
    return "";
  }

  return [personName || null, log.resolvedByUserId ? `#${log.resolvedByUserId}` : null]
    .filter(Boolean)
    .join(" · ");
}

export function getStatusBadgeClass(status: SystemErrorStatus) {
  switch (status) {
    case "NEW":
      return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200";
    case "SEEN":
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200";
    case "RESOLVED":
      return "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200";
    case "IGNORED":
      return "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300";
  }
}

export function getSeverityBadgeClass(severity: SystemErrorSeverity) {
  switch (severity) {
    case "INFO":
      return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200";
    case "WARNING":
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200";
    case "ERROR":
      return "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200";
    case "CRITICAL":
      return "border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-200";
  }
}
