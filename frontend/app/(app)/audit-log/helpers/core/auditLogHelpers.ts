import {
  dateToLocalDateString,
  formatDateDK,
  formatTimeDK,
} from "@/app/utils/dateTime";
import type { AuditLog, AuditLogGroup, AuditUser } from "./auditLogTypes";

const actionLabels: Record<string, string> = {
  CREATE_SHIFT: "Vagt oprettet",
  UPDATE_SHIFT: "Vagt rettet",
  DELETE_SHIFT: "Vagt slettet",
  SUBMIT_MANUAL_TIME_ENTRY: "Manuel tidsregistrering indsendt",
  CLOCK_IN: "Mødt ind",
  CLOCK_OUT: "Gået hjem",
  APPROVE_TIME_ENTRY: "Tidsregistrering godkendt",
  UNAPPROVE_TIME_ENTRY: "Godkendelse fjernet",
  SEND_BACK_TIME_ENTRY: "Sendt retur til rettelse",
  VOID_TIME_ENTRY: "Tidsregistrering annulleret",
  UPDATE_OWN_TIME_ENTRY: "Egen tidsregistrering rettet",
  UPDATE_TIME_ENTRY_FIELD: "Tidsregistrering ændret",
  UPDATE_TIME_ENTRY: "Tidsregistrering rettet",
  CREATE_USER: "Medarbejder oprettet",
  UPDATE_USER: "Medarbejder rettet",
  DEACTIVATE_USER: "Medarbejder deaktiveret",
  REACTIVATE_USER: "Medarbejder genaktiveret",
  LOCK_PAYROLL_PERIOD: "Lønperiode låst",
  UNLOCK_PAYROLL_PERIOD: "Lønperiode genåbnet",
};

const entityTypeLabels: Record<string, string> = {
  Shift: "Vagt",
  SHIFT: "Vagt",
  TimeEntry: "Tidsregistrering",
  TIME_ENTRY: "Tidsregistrering",
  User: "Medarbejder",
  USER: "Medarbejder",
  PayrollPeriod: "Lønperiode",
  PAYROLL_PERIOD: "Lønperiode",
};

export function getActionLabel(action: string) {
  return actionLabels[action] || formatTechnicalText(action);
}

export function getEntityTypeLabel(entityType: string) {
  return entityTypeLabels[entityType] || formatTechnicalText(entityType);
}

function formatTechnicalText(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/^\w/, (match) => match.toUpperCase());
}

function getUserName(user?: AuditUser | null) {
  if (!user) return "-";
  return `${user.firstName} ${user.lastName}`;
}

export function getPerformedBy(log: AuditLog) {
  return getUserName(log.user);
}

export function getSubjectName(log: AuditLog) {
  if (log.subjectUser) {
    return getUserName(log.subjectUser);
  }

  if (log.action === "CLOCK_IN" || log.action === "CLOCK_OUT") {
    return getUserName(log.user);
  }

  return extractSubjectFromDescription(log.description) || "-";
}

function extractSubjectFromDescription(description?: string | null) {
  if (!description) {
    return "";
  }

  const patterns = [
    / for ([A-ZÆØÅa-zæøå0-9 .'-]+?)(?:\.|\n|$)/,
    / bruger ([A-ZÆØÅa-zæøå0-9 .'-]+?)(?:\.|\n|$)/,
    / medarbejder ([A-ZÆØÅa-zæøå0-9 .'-]+?)(?:\.|\n|$)/i,
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "";
}

function getLogDateKey(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "ukendt";
  }

  return dateToLocalDateString(date);
}

function formatDateGroupLabel(dateKey: string) {
  if (dateKey === "ukendt") {
    return "Ukendt dato";
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) {
    return "Ukendt dato";
  }

  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const weekday = new Intl.DateTimeFormat("da-DK", {
    timeZone: "Europe/Copenhagen",
    weekday: "long",
  }).format(date);

  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${formatDateDK(
    date,
  )}`;
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Ukendt tidspunkt";
  }

  return `${formatDateDK(date)}, kl. ${formatTimeDK(date)}`;
}

export function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Ukendt tidspunkt";
  }

  return `kl. ${formatTimeDK(date)}`;
}

function getTimestamp(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function groupLogsByDate(logs: AuditLog[]): AuditLogGroup[] {
  const sortedLogs = [...logs].sort(
    (left, right) =>
      getTimestamp(right.createdAt) - getTimestamp(left.createdAt),
  );

  return sortedLogs.reduce<AuditLogGroup[]>((groups, log) => {
    const dateKey = getLogDateKey(log.createdAt);
    const existingGroup = groups.find((group) => group.dateKey === dateKey);

    if (existingGroup) {
      existingGroup.logs.push(log);
      return groups;
    }

    groups.push({
      dateKey,
      dateLabel: formatDateGroupLabel(dateKey),
      logs: [log],
    });
    return groups;
  }, []);
}

export async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();
    if (typeof data?.message === "string") {
      return data.message;
    }

    if (Array.isArray(data?.message)) {
      return data.message.join("\n");
    }
  } catch {
    // Brug fallback hvis svaret ikke er JSON.
  }

  return fallback;
}
