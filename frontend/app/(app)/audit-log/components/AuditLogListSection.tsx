import {
  formatDateTime,
  formatTime,
  getActionLabel,
  getEntityTypeLabel,
  getPerformedBy,
  getSubjectName,
} from "../helpers/auditLogHelpers";
import type { AuditLog, AuditLogGroup } from "../helpers/auditLogTypes";

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
        <div className="rounded-xl bg-white p-6 text-center text-gray-500 shadow dark:bg-gray-900 dark:text-gray-400 dark:shadow-none dark:ring-1 dark:ring-gray-800">
          Ingen handlinger fundet.
        </div>
      )}
    </div>
  );
}
