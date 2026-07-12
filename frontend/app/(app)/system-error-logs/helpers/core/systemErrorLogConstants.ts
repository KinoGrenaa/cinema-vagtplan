import type {
  LogAction,
  SeverityFilter,
  StatusFilter,
  SystemErrorSeverity,
  SystemErrorStatus,
} from "../../types";

export const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "ACTIVE", label: "Aktive (ny + set)" },
  { value: "", label: "Alle statusser" },
  { value: "NEW", label: "Ny" },
  { value: "SEEN", label: "Set" },
  { value: "RESOLVED", label: "Løst" },
  { value: "IGNORED", label: "Ignoreret" },
];

export const severityOptions: { value: SeverityFilter; label: string }[] = [
  { value: "", label: "Alle niveauer" },
  { value: "INFO", label: "Info" },
  { value: "WARNING", label: "Advarsel" },
  { value: "ERROR", label: "Fejl" },
  { value: "CRITICAL", label: "Kritisk" },
];

export const statusLabels: Record<SystemErrorStatus, string> = {
  NEW: "Ny",
  SEEN: "Set",
  RESOLVED: "Løst",
  IGNORED: "Ignoreret",
};

export const severityLabels: Record<SystemErrorSeverity, string> = {
  INFO: "Info",
  WARNING: "Advarsel",
  ERROR: "Fejl",
  CRITICAL: "Kritisk",
};

export const actionLabels: Record<LogAction, string> = {
  seen: "markeret som set",
  resolve: "markeret som løst",
  ignore: "ignoreret",
};

export const activeStatuses: SystemErrorStatus[] = ["NEW", "SEEN"];
