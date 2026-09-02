import type { TimeEntry } from "../../types";
import TimeApprovalEntryCard from "./TimeApprovalEntryCard";

type TimeApprovalUserGroupData = {
  userId: string;
  user: TimeEntry["user"];
  entries: TimeEntry[];
  pendingCount: number;
  needsChangesCount: number;
  approvedCount: number;
  voidedCount: number;
  manualCount: number;
  deviationCount: number;
};

type Props = {
  group: TimeApprovalUserGroupData;
  isExpanded: boolean;
  expandedEntryIds: number[];
  onToggleGroup: (userId: string) => void;
  onToggleEntryDetails: (entryId: number) => void;
  onEdit: (entry: TimeEntry) => void;
  onOpenHistory: (entry: TimeEntry) => void;
  onApprove: (entry: TimeEntry) => void;
  onUnapprove: (entry: TimeEntry) => void;
  onSendBackForChanges: (id: number) => void;
  onVoid: (entry: TimeEntry) => void;
};

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Europe/Copenhagen",
});

const dateLabelFormatter = new Intl.DateTimeFormat("da-DK", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Copenhagen",
});

function groupEntriesByDate(entries: TimeEntry[]) {
  const groups = new Map<
    string,
    {
      key: string;
      label: string;
      entries: TimeEntry[];
    }
  >();

  for (const entry of entries) {
    const date = new Date(entry.clockIn);
    const key = dateKeyFormatter.format(date);
    const current = groups.get(key);

    if (current) {
      current.entries.push(entry);
      continue;
    }

    groups.set(key, {
      key,
      label: dateLabelFormatter.format(date),
      entries: [entry],
    });
  }

  return Array.from(groups.values());
}

export default function TimeApprovalUserGroup({
  group,
  isExpanded,
  expandedEntryIds,
  onToggleGroup,
  onToggleEntryDetails,
  onEdit,
  onOpenHistory,
  onApprove,
  onUnapprove,
  onSendBackForChanges,
  onVoid,
}: Props) {
  const dateGroups = groupEntriesByDate(group.entries);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <button
        type="button"
        onClick={() => onToggleGroup(group.userId)}
        className="flex w-full flex-col gap-3 p-5 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800/60 lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold">
              {group.user.firstName} {group.user.lastName}
            </h2>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              {group.entries.length} registrering
              {group.entries.length === 1 ? "" : "er"}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {group.user.email}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          {group.pendingCount > 0 && (
            <span className="rounded-full bg-yellow-100 px-3 py-1 font-semibold text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200">
              Afventer: {group.pendingCount}
            </span>
          )}

          {group.needsChangesCount > 0 && (
            <span className="rounded-full bg-red-100 px-3 py-1 font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200">
              Skal rettes: {group.needsChangesCount}
            </span>
          )}

          {group.approvedCount > 0 && (
            <span className="rounded-full bg-green-100 px-3 py-1 font-semibold text-green-800 dark:bg-green-950/40 dark:text-green-200">
              Godkendte: {group.approvedCount}
            </span>
          )}

          {group.voidedCount > 0 && (
            <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              Annullerede: {group.voidedCount}
            </span>
          )}

          {group.manualCount > 0 && (
            <span className="rounded-full bg-orange-100 px-3 py-1 font-semibold text-orange-800 dark:bg-orange-950/40 dark:text-orange-200">
              Manuel: {group.manualCount}
            </span>
          )}

          {group.deviationCount > 0 && (
            <span className="rounded-full bg-orange-100 px-3 py-1 font-semibold text-orange-800 dark:bg-orange-950/40 dark:text-orange-200">
              Afvigelser: {group.deviationCount}
            </span>
          )}

          <span className="ml-1 rounded-xl bg-gray-900 px-3 py-2 text-xs font-semibold text-white dark:bg-gray-100 dark:text-gray-900">
            {isExpanded ? "Skjul timer" : "Vis timer"}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="space-y-5 border-t border-gray-200 p-4 dark:border-gray-800">
          {dateGroups.map((dateGroup) => (
            <section key={dateGroup.key}>
              <div className="mb-2 flex flex-wrap items-center gap-2 px-1">
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 first-letter:uppercase dark:text-gray-400">
                  {dateGroup.label}
                </h3>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {dateGroup.entries.length}
                </span>
              </div>

              <div className="space-y-2">
                {dateGroup.entries.map((entry) => (
                  <TimeApprovalEntryCard
                    key={entry.id}
                    entry={entry}
                    isExpanded={expandedEntryIds.includes(entry.id)}
                    onToggleDetails={onToggleEntryDetails}
                    onEdit={onEdit}
                    onOpenHistory={onOpenHistory}
                    onApprove={onApprove}
                    onUnapprove={onUnapprove}
                    onSendBackForChanges={onSendBackForChanges}
                    onVoid={onVoid}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
