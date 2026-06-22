"use client";

import { useEffect, useMemo, useState } from "react";

import PermissionGuard from "@/app/components/PermissionGuard";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  dateToLocalDateString,
  formatDateDK,
  formatTimeDK,
} from "@/app/utils/dateTime";

type AuditUser = {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
};

type AuditLog = {
  id: number;
  action: string;
  entityType: string;
  entityId?: number | null;
  description?: string | null;
  createdAt: string;

  user?: AuditUser | null;
  subjectUser?: AuditUser | null;

  cinema?: {
    name: string;
  } | null;
};

type AuditLogGroup = {
  dateKey: string;
  dateLabel: string;
  logs: AuditLog[];
};

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

function getActionLabel(action: string) {
  return actionLabels[action] || formatTechnicalText(action);
}

function getEntityTypeLabel(entityType: string) {
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

function getPerformedBy(log: AuditLog) {
  return getUserName(log.user);
}

function getSubjectName(log: AuditLog) {
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

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Ukendt tidspunkt";
  }

  return `${formatDateDK(date)}, kl. ${formatTimeDK(date)}`;
}

function formatTime(value: string) {
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

function groupLogsByDate(logs: AuditLog[]): AuditLogGroup[] {
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

async function readErrorMessage(response: Response, fallback: string) {
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

export default function AuditLogPage() {
  const { isMaster, user } = useAuth();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [expandedDateKeys, setExpandedDateKeys] = useState<string[]>([]);
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<
    string | null
  >(null);
  const errorDialog = useInfoModal();

  const needsMasterCinemaSelection =
    user?.role === "MASTER" && !user.cinemaId && !selectedMasterCinemaId;

  useEffect(() => {
    function updateSelectedMasterCinema() {
      setSelectedMasterCinemaId(
        window.localStorage.getItem("masterSelectedCinemaId"),
      );
    }

    updateSelectedMasterCinema();

    window.addEventListener(
      "masterSelectedCinemaChanged",
      updateSelectedMasterCinema,
    );
    window.addEventListener("storage", updateSelectedMasterCinema);

    return () => {
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        updateSelectedMasterCinema,
      );
      window.removeEventListener("storage", updateSelectedMasterCinema);
    };
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [selectedMasterCinemaId, user?.role, user?.cinemaId]);

  async function fetchLogs() {
    if (!user) {
      setLogs([]);
      setLoading(false);
      return;
    }

    if (needsMasterCinemaSelection) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const endpoint =
        user.role === "MASTER" && !user.cinemaId && selectedMasterCinemaId
          ? `/audit-logs?cinemaId=${encodeURIComponent(selectedMasterCinemaId)}`
          : "/audit-logs";

      const response = await apiFetch(endpoint);

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Kunne ikke hente ændringshistorik.",
          ),
        );
      }

      const data = await response.json();

      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      errorDialog.showError(
        "Kunne ikke hente ændringshistorik",
        error instanceof Error
          ? error.message
          : "Der opstod en uventet fejl under hentning af ændringshistorikken.",
      );
    } finally {
      setLoading(false);
    }
  }

  const entityTypes = useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.entityType))).sort();
  }, [logs]);

  const visibleLogs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return logs.filter((log) => {
      if (entityFilter !== "ALL" && log.entityType !== entityFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        log.action,
        getActionLabel(log.action),
        log.entityType,
        getEntityTypeLabel(log.entityType),
        log.entityId?.toString(),
        log.description,
        getSubjectName(log),
        getPerformedBy(log),
        log.user?.email,
        log.subjectUser?.email,
        isMaster ? log.cinema?.name : undefined,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [logs, search, entityFilter, isMaster]);

  const groupedLogs = useMemo(() => {
    return groupLogsByDate(visibleLogs);
  }, [visibleLogs]);

  useEffect(() => {
    setExpandedDateKeys((current) => {
      const validKeys = groupedLogs.map((group) => group.dateKey);

      if (validKeys.length === 0) {
        return [];
      }

      const currentValidKeys = current.filter((dateKey) =>
        validKeys.includes(dateKey),
      );
      const latestDateKey = validKeys[0];
      const nextKeys = currentValidKeys.includes(latestDateKey)
        ? currentValidKeys
        : [latestDateKey, ...currentValidKeys];

      const isUnchanged =
        nextKeys.length === current.length &&
        nextKeys.every((dateKey, index) => dateKey === current[index]);

      return isUnchanged ? current : nextKeys;
    });
  }, [groupedLogs]);

  function toggleDateGroup(dateKey: string) {
    setExpandedDateKeys((current) =>
      current.includes(dateKey)
        ? current.filter((currentDateKey) => currentDateKey !== dateKey)
        : [dateKey, ...current],
    );
  }

  if (loading) {
    return (
      <PermissionGuard permission="canManageUsers">
        <>
          <div className="min-h-screen bg-gray-50 p-6 text-gray-600 dark:bg-gray-950 dark:text-gray-300">
            Indlæser ændringshistorik...
          </div>

          <InfoModal
            open={errorDialog.open}
            title={errorDialog.title}
            description={errorDialog.description}
            buttonText={errorDialog.buttonText}
            variant={errorDialog.variant}
            onClose={errorDialog.close}
          />
        </>
      </PermissionGuard>
    );
  }

  if (needsMasterCinemaSelection) {
    return (
      <PermissionGuard permission="canManageUsers">
        <div className="min-h-screen bg-gray-50 p-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
          <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm dark:border-amber-800 dark:bg-amber-950/30">
            <h1 className="text-xl font-bold text-amber-950 dark:text-amber-100">
              Ingen aktiv biograf valgt
            </h1>
            <p className="mt-1 text-sm text-amber-900 dark:text-amber-100/80">
              Vælg en biograf i MASTER-panelet, før du kan se ændringshistorik.
            </p>
          </section>

          <InfoModal
            open={errorDialog.open}
            title={errorDialog.title}
            description={errorDialog.description}
            buttonText={errorDialog.buttonText}
            variant={errorDialog.variant}
            onClose={errorDialog.close}
          />
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard permission="canManageUsers">
      <div className="min-h-screen bg-gray-50 p-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Ændringshistorik
          </h1>

          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Overblik over administrative handlinger og vigtige ændringer i
            systemet.
          </p>
        </div>

        <div className="mb-4 grid gap-3 rounded-xl bg-white p-4 shadow dark:bg-gray-900 dark:shadow-none dark:ring-1 dark:ring-gray-800 md:grid-cols-[1fr_240px]">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Søg
            </label>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Søg i handling, beskrivelse eller medarbejder..."
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Type
            </label>

            <select
              value={entityFilter}
              onChange={(event) => setEntityFilter(event.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            >
              <option value="ALL">Alle typer</option>

              {entityTypes.map((entityType) => (
                <option key={entityType} value={entityType}>
                  {getEntityTypeLabel(entityType)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl bg-white px-4 py-3 text-sm text-gray-500 shadow dark:bg-gray-900 dark:text-gray-400 dark:shadow-none dark:ring-1 dark:ring-gray-800">
            Viser {visibleLogs.length} af {logs.length} handlinger
          </div>

          {groupedLogs.map((group) => {
            const isExpanded = expandedDateKeys.includes(group.dateKey);

            return (
              <section
                key={group.dateKey}
                className="overflow-hidden rounded-xl bg-white shadow dark:bg-gray-900 dark:shadow-none dark:ring-1 dark:ring-gray-800"
              >
                <button
                  type="button"
                  onClick={() => toggleDateGroup(group.dateKey)}
                  aria-expanded={isExpanded}
                  className="flex w-full flex-col gap-2 border-b border-gray-200 px-4 py-4 text-left transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-950 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {group.dateLabel}
                    </div>

                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {group.logs.length} handlinger
                    </div>
                  </div>

                  <span className="w-fit rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white dark:bg-gray-100 dark:text-gray-950">
                    {isExpanded ? "Skjul" : "Vis"}
                  </span>
                </button>

                {isExpanded && (
                  <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    {group.logs.map((log) => (
                      <article
                        key={log.id}
                        className="grid gap-3 px-4 py-4 lg:grid-cols-[120px_1fr]"
                      >
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {formatTime(log.createdAt)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              {getActionLabel(log.action)}
                            </span>

                            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                              {getEntityTypeLabel(log.entityType)}
                            </span>
                          </div>

                          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-900 dark:text-gray-100">
                            {log.description || "-"}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <div>
                              <span className="font-medium text-gray-800 dark:text-gray-200">
                                Vedrører:
                              </span>{" "}
                              {getSubjectName(log)}
                              {log.subjectUser?.email && (
                                <span className="ml-1 text-xs text-gray-500 dark:text-gray-500">
                                  ({log.subjectUser.email})
                                </span>
                              )}
                            </div>

                            <div>
                              <span className="font-medium text-gray-800 dark:text-gray-200">
                                Udført af:
                              </span>{" "}
                              {getPerformedBy(log)}
                              {log.user?.email && (
                                <span className="ml-1 text-xs text-gray-500 dark:text-gray-500">
                                  ({log.user.email})
                                </span>
                              )}
                            </div>

                            {isMaster && (
                              <div>
                                <span className="font-medium text-gray-800 dark:text-gray-200">
                                  Biograf:
                                </span>{" "}
                                {log.cinema?.name || "-"}
                              </div>
                            )}
                          </div>

                          <details className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                            <summary className="w-fit cursor-pointer select-none rounded-lg px-0 py-1 hover:text-gray-800 dark:hover:text-gray-300">
                              Vis tekniske detaljer
                            </summary>

                            <div className="mt-2 w-fit space-y-1 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-950">
                              <div>Handling: {log.action}</div>
                              <div>Type: {log.entityType}</div>
                              {log.entityId && <div>ID: {log.entityId}</div>}
                              <div>
                                Tidspunkt: {formatDateTime(log.createdAt)}
                              </div>
                            </div>
                          </details>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            );
          })}

          {visibleLogs.length === 0 && (
            <div className="rounded-xl bg-white p-6 text-center text-gray-500 shadow dark:bg-gray-900 dark:text-gray-400 dark:shadow-none dark:ring-1 dark:ring-gray-800">
              Ingen handlinger fundet.
            </div>
          )}
        </div>

        <InfoModal
          open={errorDialog.open}
          title={errorDialog.title}
          description={errorDialog.description}
          buttonText={errorDialog.buttonText}
          variant={errorDialog.variant}
          onClose={errorDialog.close}
        />
      </div>
    </PermissionGuard>
  );
}
