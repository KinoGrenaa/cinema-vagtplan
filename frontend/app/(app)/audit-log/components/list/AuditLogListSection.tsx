import {
  formatDateTime,
  formatTime,
  getActionLabel,
  getEntityTypeLabel,
  getPerformedBy,
  getSubjectName,
} from "../../helpers/core/auditLogHelpers";
import type { AuditLog, AuditLogGroup } from "../../helpers/core/auditLogTypes";

type AuditLogListSectionProps = {
  logs: AuditLog[];
  visibleLogs: AuditLog[];
  groupedLogs: AuditLogGroup[];
  expandedDateKeys: string[];
  isMaster: boolean;
  toggleDateGroup: (dateKey: string) => void;
};

export default function AuditLogListSection({
  logs,
  visibleLogs,
  groupedLogs,
  expandedDateKeys,
  isMaster,
  toggleDateGroup,
}: AuditLogListSectionProps) {
  return (
    <div className="space-y-4">
      <div
        aria-live="polite"
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:shadow-none"
      >
        Viser {visibleLogs.length} af {logs.length} handlinger
      </div>

      {groupedLogs.map((group) => {
        const isExpanded = expandedDateKeys.includes(group.dateKey);

        return (
          <section
            key={group.dateKey}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
          >
            <button
              type="button"
              onClick={() => toggleDateGroup(group.dateKey)}
              aria-expanded={isExpanded}
              className="flex w-full flex-col gap-3 border-b border-slate-200 px-4 py-4 text-left outline-none transition hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-blue-500/25 dark:border-slate-800 dark:hover:bg-slate-800/60 dark:focus-visible:ring-blue-400/30 sm:px-5 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="text-lg font-semibold text-slate-950 dark:text-white">
                  {group.dateLabel}
                </div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {group.logs.length} handlinger
                </div>
              </div>

              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-950">
                {isExpanded ? "Skjul" : "Vis"}
                <span
                  aria-hidden="true"
                  className={`text-sm transition-transform ${isExpanded ? "rotate-180" : ""}`}
                >
                  ▾
                </span>
              </span>
            </button>

            {isExpanded && (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {group.logs.map((log) => (
                  <article
                    key={log.id}
                    className="grid gap-3 px-4 py-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/35 sm:px-5 lg:grid-cols-[120px_minmax(0,1fr)]"
                  >
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {formatTime(log.createdAt)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200">
                          {getActionLabel(log.action)}
                        </span>
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {getEntityTypeLabel(log.entityType)}
                        </span>
                      </div>

                      <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-950 dark:text-slate-100">
                        {log.description || "-"}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-slate-100">
                            Vedrører:
                          </span>{" "}
                          {getSubjectName(log)}
                          {log.subjectUser?.email && (
                            <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
                              ({log.subjectUser.email})
                            </span>
                          )}
                        </div>

                        <div>
                          <span className="font-semibold text-slate-800 dark:text-slate-100">
                            Udført af:
                          </span>{" "}
                          {getPerformedBy(log)}
                          {log.user?.email && (
                            <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
                              ({log.user.email})
                            </span>
                          )}
                        </div>

                        {isMaster && (
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                              Biograf:
                            </span>{" "}
                            {log.cinema?.name || "-"}
                          </div>
                        )}
                      </div>

                      <details className="group mt-3 text-xs text-slate-500 dark:text-slate-400">
                        <summary className="w-fit cursor-pointer select-none rounded-lg px-2 py-1.5 font-medium outline-none transition hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-4 focus-visible:ring-blue-500/20 dark:hover:bg-slate-800 dark:hover:text-slate-200 dark:focus-visible:ring-blue-400/25">
                          Vis tekniske detaljer
                        </summary>
                        <div className="mt-2 w-fit max-w-full space-y-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                          <div>Handling: {log.action}</div>
                          <div>Type: {log.entityType}</div>
                          {log.entityId && <div>ID: {log.entityId}</div>}
                          <div>Tidspunkt: {formatDateTime(log.createdAt)}</div>
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
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
          <div className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Ingen handlinger fundet
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Prøv at ændre søgningen eller vælge en anden type.
          </p>
        </div>
      )}
    </div>
  );
}
