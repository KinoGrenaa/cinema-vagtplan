import {
  severityLabels,
  statusLabels,
} from "../../helpers/core/systemErrorLogConstants";
import {
  formatCinema,
  formatDateTime,
  formatResolvedBy,
  formatUser,
  getSeverityBadgeClass,
  getStatusBadgeClass,
} from "../../helpers/core/systemErrorLogHelpers";
import type {
  LogAction,
  SystemErrorLog,
} from "../../types";

type SystemErrorLogListProps = {
  logs: SystemErrorLog[];
  loading: boolean;
  updatingLogId: number | null;
  onUpdateStatus: (
    logId: number,
    action: LogAction,
    note?: string,
  ) => Promise<void>;
  onRequestResolutionNote: (
    log: SystemErrorLog,
    action: Extract<
      LogAction,
      "resolve" | "ignore"
    >,
  ) => void;
};

async function copyCorrelationId(
  correlationId: string,
) {
  if (
    !navigator.clipboard?.writeText
  ) {
    return;
  }

  await navigator.clipboard.writeText(
    correlationId,
  );
}

const secondaryButtonClass =
  "rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:bg-gray-800 dark:disabled:text-gray-500";

export default function SystemErrorLogList({
  logs,
  loading,
  updatingLogId,
  onUpdateStatus,
  onRequestResolutionNote,
}: SystemErrorLogListProps) {
  return (
    <section className="space-y-3">
      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-700 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
          Indlæser systemfejl...
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
          Ingen systemfejl matcher de
          valgte filtre.
        </div>
      ) : (
        logs.map((log) => (
          <article
            key={log.id}
            className="rounded-2xl border border-gray-200 bg-white p-5 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getSeverityBadgeClass(
                      log.severity,
                    )}`}
                  >
                    {
                      severityLabels[
                        log.severity
                      ]
                    }
                  </span>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
                      log.status,
                    )}`}
                  >
                    {
                      statusLabels[
                        log.status
                      ]
                    }
                  </span>

                  {log.statusCode && (
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                      HTTP{" "}
                      {log.statusCode}
                    </span>
                  )}
                </div>

                <h2 className="mt-3 break-words text-lg font-semibold text-gray-950 dark:text-white">
                  {log.message}
                </h2>

                <div className="mt-3 grid gap-2 text-sm text-gray-600 dark:text-gray-400 md:grid-cols-2">
                  <p>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      Tidspunkt:
                    </span>{" "}
                    {formatDateTime(
                      log.createdAt,
                    )}
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
                    {[
                      log.method,
                      log.path ??
                        log.action ??
                        "-",
                    ]
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
                      {formatDateTime(
                        log.resolvedAt,
                      )}
                    </p>
                  )}

                  {formatResolvedBy(
                    log,
                  ) && (
                    <p>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        Afsluttet af:
                      </span>{" "}
                      {formatResolvedBy(
                        log,
                      )}
                    </p>
                  )}

                  {log.correlationId && (
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="min-w-0 break-all">
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          Correlation:
                        </span>{" "}
                        {
                          log.correlationId
                        }
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          void copyCorrelationId(
                            log.correlationId as string,
                          )
                        }
                        title="Kopiér correlation-id"
                        className="shrink-0 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-800 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
                      >
                        Kopiér
                      </button>
                    </div>
                  )}
                </div>

                {log.technicalMessage && (
                  <p className="mt-3 break-words rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950/50 dark:text-gray-300">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      Teknisk:
                    </span>{" "}
                    {
                      log.technicalMessage
                    }
                  </p>
                )}

                {log.resolutionNote && (
                  <p className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-900 dark:bg-green-950/30 dark:text-green-100">
                    <span className="font-medium">
                      Note:
                    </span>{" "}
                    {log.resolutionNote}
                  </p>
                )}
              </div>

              <div className="flex w-full flex-wrap gap-2 md:w-auto md:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    void onUpdateStatus(
                      log.id,
                      "seen",
                    )
                  }
                  disabled={
                    updatingLogId ===
                      log.id ||
                    log.status !== "NEW"
                  }
                  className={
                    secondaryButtonClass
                  }
                >
                  Markér set
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onRequestResolutionNote(
                      log,
                      "resolve",
                    )
                  }
                  disabled={
                    updatingLogId ===
                      log.id ||
                    log.status ===
                      "RESOLVED"
                  }
                  className="rounded-xl bg-green-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-green-200 disabled:text-green-700 dark:bg-green-600 dark:hover:bg-green-500 dark:focus-visible:ring-green-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:bg-green-950 dark:disabled:text-green-400"
                >
                  Løst
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onRequestResolutionNote(
                      log,
                      "ignore",
                    )
                  }
                  disabled={
                    updatingLogId ===
                      log.id ||
                    log.status ===
                      "IGNORED"
                  }
                  className="rounded-xl bg-gray-800 px-3 py-2 text-sm font-semibold text-white transition hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:bg-gray-900 dark:disabled:text-gray-500"
                >
                  Ignorer
                </button>
              </div>
            </div>
          </article>
        ))
      )}
    </section>
  );
}
