"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import InfoModal from "@/app/components/modals/InfoModal";
import InputModal from "@/app/components/modals/InputModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useInputModal } from "@/app/hooks/useInputModal";
import { apiFetch } from "@/app/lib/api";
import { useAuth } from "@/app/providers/AuthProvider";

type SystemErrorSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";
type SystemErrorStatus = "NEW" | "SEEN" | "RESOLVED" | "IGNORED";
type StatusFilter = SystemErrorStatus | "ACTIVE" | "";
type SeverityFilter = SystemErrorSeverity | "";
type LogAction = "seen" | "resolve" | "ignore";

type SystemErrorLog = {
  id: number;
  createdAt: string;
  updatedAt: string;
  severity: SystemErrorSeverity;
  status: SystemErrorStatus;
  source: string;
  method: string | null;
  path: string | null;
  action: string | null;
  message: string;
  technicalMessage: string | null;
  correlationId: string | null;
  statusCode: number | null;
  userId: number | null;
  userRole: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  userEmail: string | null;
  cinemaId: number | null;
  cinemaName: string | null;
  resolvedAt: string | null;
  resolvedByUserId: number | null;
  resolvedByFirstName: string | null;
  resolvedByLastName: string | null;
  resolvedByEmail: string | null;
  resolutionNote: string | null;
};

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "ACTIVE", label: "Aktive (ny + set)" },
  { value: "", label: "Alle statusser" },
  { value: "NEW", label: "Ny" },
  { value: "SEEN", label: "Set" },
  { value: "RESOLVED", label: "Løst" },
  { value: "IGNORED", label: "Ignoreret" },
];

const severityOptions: { value: SeverityFilter; label: string }[] = [
  { value: "", label: "Alle niveauer" },
  { value: "INFO", label: "Info" },
  { value: "WARNING", label: "Advarsel" },
  { value: "ERROR", label: "Fejl" },
  { value: "CRITICAL", label: "Kritisk" },
];

const statusLabels: Record<SystemErrorStatus, string> = {
  NEW: "Ny",
  SEEN: "Set",
  RESOLVED: "Løst",
  IGNORED: "Ignoreret",
};

const severityLabels: Record<SystemErrorSeverity, string> = {
  INFO: "Info",
  WARNING: "Advarsel",
  ERROR: "Fejl",
  CRITICAL: "Kritisk",
};

const actionLabels: Record<LogAction, string> = {
  seen: "markeret som set",
  resolve: "markeret som løst",
  ignore: "ignoreret",
};

const activeStatuses: SystemErrorStatus[] = ["NEW", "SEEN"];

function getQuickFilterButtonClass(active: boolean) {
  const baseClass =
    "rounded-xl border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60";

  if (active) {
    return `${baseClass} border-purple-700 bg-purple-700 text-white hover:bg-purple-800 dark:border-purple-500 dark:bg-purple-500 dark:hover:bg-purple-400`;
  }

  return `${baseClass} border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800`;
}

async function readErrorMessage(response: Response, fallback: string) {
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

function formatDateTime(value: string | null) {
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

function formatUser(log: SystemErrorLog) {
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

function formatCinema(log: SystemErrorLog) {
  if (log.cinemaName && log.cinemaId) {
    return `${log.cinemaName} · #${log.cinemaId}`;
  }

  if (log.cinemaName) {
    return log.cinemaName;
  }

  return log.cinemaId ? `Biograf #${log.cinemaId}` : "Global/ukendt";
}

function formatResolvedBy(log: SystemErrorLog) {
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

function getStatusBadgeClass(status: SystemErrorStatus) {
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

function getSeverityBadgeClass(severity: SystemErrorSeverity) {
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

export default function SystemErrorLogsPage() {
  const { loading: authLoading, isMaster } = useAuth();
  const infoDialog = useInfoModal();
  const noteDialog = useInputModal();
  const showErrorRef = useRef(infoDialog.showError);

  const [logs, setLogs] = useState<SystemErrorLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [updatingLogId, setUpdatingLogId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("");
  const [cinemaIdFilter, setCinemaIdFilter] = useState("");

  useEffect(() => {
    showErrorRef.current = infoDialog.showError;
  }, [infoDialog.showError]);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);

    try {
      const params = new URLSearchParams();
      params.set("take", "300");

      if (statusFilter && statusFilter !== "ACTIVE") {
        params.set("status", statusFilter);
      }

      if (severityFilter) {
        params.set("severity", severityFilter);
      }

      const cinemaId = cinemaIdFilter.trim();

      if (cinemaId) {
        params.set("cinemaId", cinemaId);
      }

      const response = await apiFetch(`/system-error-logs?${params.toString()}`);

      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          "Systemfejlloggen kunne ikke hentes.",
        );

        showErrorRef.current("Kunne ikke hente systemfejl", message);
        return;
      }

      const data = (await response.json()) as SystemErrorLog[];
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      showErrorRef.current(
        "Kunne ikke hente systemfejl",
        error instanceof Error ? error.message : "Ukendt fejl",
      );
    } finally {
      setLoadingLogs(false);
    }
  }, [cinemaIdFilter, severityFilter, statusFilter]);

  useEffect(() => {
    if (authLoading || !isMaster) {
      return;
    }

    void fetchLogs();
  }, [authLoading, fetchLogs, isMaster]);

  const visibleLogs = useMemo(() => {
    if (statusFilter !== "ACTIVE") {
      return logs;
    }

    return logs.filter((log) => activeStatuses.includes(log.status));
  }, [logs, statusFilter]);

  const summaryCards = useMemo(
    () => [
      {
        label: "Nye",
        value: visibleLogs.filter((log) => log.status === "NEW").length,
      },
      {
        label: "Set",
        value: visibleLogs.filter((log) => log.status === "SEEN").length,
      },
      {
        label: "Løst",
        value: visibleLogs.filter((log) => log.status === "RESOLVED").length,
      },
      {
        label: "Ignoreret",
        value: visibleLogs.filter((log) => log.status === "IGNORED").length,
      },
    ],
    [visibleLogs],
  );

  async function updateStatus(logId: number, action: LogAction, note?: string) {
    setUpdatingLogId(logId);

    try {
      const options: RequestInit = {
        method: "PATCH",
      };

      if (action !== "seen") {
        options.body = JSON.stringify({ note: note?.trim() ?? "" });
      }

      const response = await apiFetch(
        `/system-error-logs/${logId}/${action}`,
        options,
      );

      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          "Status kunne ikke opdateres.",
        );

        infoDialog.showError("Kunne ikke opdatere status", message);
        return;
      }

      await fetchLogs();

      infoDialog.show({
        title: "Status opdateret",
        description: `Fejlen er ${actionLabels[action]}.`,
        variant: "success",
        buttonText: "OK",
      });
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke opdatere status",
        error instanceof Error ? error.message : "Ukendt fejl",
      );
    } finally {
      setUpdatingLogId(null);
    }
  }

  function requestResolutionNote(
    log: SystemErrorLog,
    action: Extract<LogAction, "resolve" | "ignore">,
  ) {
    const isResolve = action === "resolve";

    noteDialog.prompt({
      title: isResolve ? "Markér systemfejl som løst" : "Ignorer systemfejl",
      description: isResolve
        ? "Skriv en kort intern note om, hvorfor fejlen er løst."
        : "Skriv en kort intern note om, hvorfor fejlen ignoreres.",
      label: "Intern note",
      placeholder: isResolve
        ? "Fx rettet i seneste deploy eller skyldes kendt validering."
        : "Fx dublet, forventet brugerfejl eller ikke relevant.",
      confirmText: isResolve ? "Markér løst" : "Ignorer",
      cancelText: "Annuller",
      required: true,
      onConfirm: async (note) => {
        await updateStatus(log.id, action, note);
      },
    });
  }

  function showActiveErrors() {
    setStatusFilter("ACTIVE");
    setSeverityFilter("");
  }

  function showNewErrors() {
    setStatusFilter("NEW");
    setSeverityFilter("");
  }

  function showCriticalErrors() {
    setStatusFilter("ACTIVE");
    setSeverityFilter("CRITICAL");
  }

  function showAllErrors() {
    setStatusFilter("");
    setSeverityFilter("");
  }

  function resetFilters() {
    setStatusFilter("ACTIVE");
    setSeverityFilter("");
    setCinemaIdFilter("");
  }

  if (authLoading) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          Kontrollerer adgang...
        </div>
      </main>
    );
  }

  if (!isMaster) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <h1 className="text-2xl font-bold">Ingen adgang</h1>
          <p className="mt-2">Denne side er kun for globale MASTER-brugere.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-purple-700 dark:text-purple-300">
                MASTER-værktøj
              </p>
              <h1 className="mt-1 text-3xl font-bold">Systemfejllog</h1>
              <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
                Se backend-fejl på tværs af systemet, filtrer efter status,
                niveau og biograf, og markér fejl som set, løst eller ignoreret.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/master"
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800"
              >
                Tilbage til MASTER
              </Link>
              <button
                type="button"
                onClick={() => void fetchLogs()}
                disabled={loadingLogs}
                className="rounded-xl bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-purple-500 dark:hover:bg-purple-400"
              >
                {loadingLogs ? "Opdaterer..." : "Opdater liste"}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {card.label}
              </p>
              <p className="mt-1 text-3xl font-bold">{card.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={showActiveErrors}
              className={getQuickFilterButtonClass(
                statusFilter === "ACTIVE" && severityFilter === "",
              )}
            >
              Aktive
            </button>
            <button
              type="button"
              onClick={showNewErrors}
              className={getQuickFilterButtonClass(
                statusFilter === "NEW" && severityFilter === "",
              )}
            >
              Nye
            </button>
            <button
              type="button"
              onClick={showCriticalErrors}
              className={getQuickFilterButtonClass(
                statusFilter === "ACTIVE" && severityFilter === "CRITICAL",
              )}
            >
              Kritiske
            </button>
            <button
              type="button"
              onClick={showAllErrors}
              className={getQuickFilterButtonClass(
                statusFilter === "" && severityFilter === "",
              )}
            >
              Alle
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-[220px_220px_1fr_auto]">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              >
                {statusOptions.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Niveau
              </label>
              <select
                value={severityFilter}
                onChange={(event) =>
                  setSeverityFilter(event.target.value as SeverityFilter)
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              >
                {severityOptions.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Biograf-ID
              </label>
              <input
                value={cinemaIdFilter}
                onChange={(event) =>
                  setCinemaIdFilter(event.target.value.replace(/\D/g, ""))
                }
                inputMode="numeric"
                placeholder="Fx 1"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={resetFilters}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800"
              >
                Nulstil filter
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          {loadingLogs ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
              Indlæser systemfejl...
            </div>
          ) : visibleLogs.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
              Ingen systemfejl matcher de valgte filtre.
            </div>
          ) : (
            visibleLogs.map((log) => (
              <article
                key={log.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getSeverityBadgeClass(
                          log.severity,
                        )}`}
                      >
                        {severityLabels[log.severity]}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
                          log.status,
                        )}`}
                      >
                        {statusLabels[log.status]}
                      </span>
                      {log.statusCode && (
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                          HTTP {log.statusCode}
                        </span>
                      )}
                    </div>

                    <h2 className="mt-3 break-words text-lg font-semibold">
                      {log.message}
                    </h2>

                    <div className="mt-3 grid gap-2 text-sm text-gray-600 dark:text-gray-400 md:grid-cols-2">
                      <p>
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          Tidspunkt:
                        </span>{" "}
                        {formatDateTime(log.createdAt)}
                      </p>
                      <p>
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          Kilde:
                        </span>{" "}
                        {log.source}
                      </p>
                      <p className="break-words">
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          Path:
                        </span>{" "}
                        {[log.method, log.path ?? log.action ?? "-"]
                          .filter(Boolean)
                          .join(" ")}
                      </p>
                      <p>
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          Bruger:
                        </span>{" "}
                        {formatUser(log)}
                      </p>
                      <p>
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          Biograf:
                        </span>{" "}
                        {formatCinema(log)}
                      </p>
                      {log.resolvedAt && (
                        <p>
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            Afsluttet:
                          </span>{" "}
                          {formatDateTime(log.resolvedAt)}
                        </p>
                      )}
                      {formatResolvedBy(log) && (
                        <p>
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            Afsluttet af:
                          </span>{" "}
                          {formatResolvedBy(log)}
                        </p>
                      )}
                      {log.correlationId && (
                        <p className="break-words">
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            Correlation:
                          </span>{" "}
                          {log.correlationId}
                        </p>
                      )}
                    </div>

                    {log.technicalMessage && (
                      <p className="mt-3 break-words rounded-xl bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-950 dark:text-gray-300">
                        <span className="font-medium">Teknisk:</span>{" "}
                        {log.technicalMessage}
                      </p>
                    )}

                    {log.resolutionNote && (
                      <p className="mt-3 rounded-xl bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/30 dark:text-green-200">
                        <span className="font-medium">Note:</span>{" "}
                        {log.resolutionNote}
                      </p>
                    )}
                  </div>

                  <div className="flex w-full flex-wrap gap-2 md:w-auto md:justify-end">
                    <button
                      type="button"
                      onClick={() => void updateStatus(log.id, "seen")}
                      disabled={updatingLogId === log.id || log.status !== "NEW"}
                      className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800"
                    >
                      Markér set
                    </button>
                    <button
                      type="button"
                      onClick={() => requestResolutionNote(log, "resolve")}
                      disabled={
                        updatingLogId === log.id || log.status === "RESOLVED"
                      }
                      className="rounded-xl bg-green-700 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-500"
                    >
                      Løst
                    </button>
                    <button
                      type="button"
                      onClick={() => requestResolutionNote(log, "ignore")}
                      disabled={
                        updatingLogId === log.id || log.status === "IGNORED"
                      }
                      className="rounded-xl bg-gray-800 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:hover:bg-gray-600"
                    >
                      Ignorer
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </div>

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />

      <InputModal
        open={noteDialog.open}
        title={noteDialog.title}
        description={noteDialog.description}
        label={noteDialog.label}
        placeholder={noteDialog.placeholder}
        value={noteDialog.value}
        confirmText={noteDialog.confirmText}
        cancelText={noteDialog.cancelText}
        loading={noteDialog.loading}
        required={noteDialog.required}
        onChange={noteDialog.setValue}
        onConfirm={noteDialog.handleConfirm}
        onCancel={noteDialog.handleCancel}
      />
    </main>
  );
}
