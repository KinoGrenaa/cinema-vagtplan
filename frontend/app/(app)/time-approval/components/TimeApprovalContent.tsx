import type { Dispatch, SetStateAction } from "react";

import type { TimeEntry } from "../types";
import TimeApprovalToolbar from "./TimeApprovalToolbar";
import TimeApprovalUserGroup from "./TimeApprovalUserGroup";

type TimeApprovalGroup = {
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
  loading: boolean;
  entriesCount: number;
  visibleEntriesCount: number;
  activeFilterCount: number;
  employeeSearch: string;
  pendingCount: number;
  needsChangesCount: number;
  groups: TimeApprovalGroup[];
  expandedUserIds: string[];
  expandedEntryIds: number[];
  onEmployeeSearchChange: (value: string) => void;
  onOpenFilters: () => void;
  onResetFilters: () => void;
  onToggleGroup: (userId: string) => void;
  onToggleEntryDetails: (entryId: number) => void;
  onEdit: Dispatch<SetStateAction<TimeEntry | null>>;
  onOpenHistory: (entry: TimeEntry) => void;
  onApprove: (entry: TimeEntry) => void;
  onUnapprove: (entryId: number) => void;
  onSendBackForChanges: (entryId: number) => void;
  onVoid: (entryId: number) => void;
};

export default function TimeApprovalContent({
  loading,
  entriesCount,
  visibleEntriesCount,
  activeFilterCount,
  employeeSearch,
  pendingCount,
  needsChangesCount,
  groups,
  expandedUserIds,
  expandedEntryIds,
  onEmployeeSearchChange,
  onOpenFilters,
  onResetFilters,
  onToggleGroup,
  onToggleEntryDetails,
  onEdit,
  onOpenHistory,
  onApprove,
  onUnapprove,
  onSendBackForChanges,
  onVoid,
}: Props) {
  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-3xl font-bold">Godkend timer</h1>

          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Gennemgå, godkend eller send mødetid og fyraften retur til rettelse
            med tydelig sammenligning mellem vagtplan og registreret tid.
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            Henter tidsregistreringer...
          </div>
        )}

        {!loading && (
          <div className="space-y-4">
            <TimeApprovalToolbar
              activeFilterCount={activeFilterCount}
              employeeSearch={employeeSearch}
              pendingCount={pendingCount}
              needsChangesCount={needsChangesCount}
              onEmployeeSearchChange={onEmployeeSearchChange}
              onOpenFilters={onOpenFilters}
              onResetFilters={onResetFilters}
            />

            {entriesCount > 0 && visibleEntriesCount === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-2 text-4xl">🔎</div>

                <h2 className="text-xl font-bold">
                  Ingen tidsregistreringer matcher filteret
                </h2>

                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  Justér filteret for at se flere registreringer.
                </p>
              </div>
            ) : (
              groups.map((group) => (
                <TimeApprovalUserGroup
                  key={group.userId}
                  group={group}
                  isExpanded={expandedUserIds.includes(group.userId)}
                  expandedEntryIds={expandedEntryIds}
                  onToggleGroup={onToggleGroup}
                  onToggleEntryDetails={onToggleEntryDetails}
                  onEdit={onEdit}
                  onOpenHistory={onOpenHistory}
                  onApprove={onApprove}
                  onUnapprove={onUnapprove}
                  onSendBackForChanges={onSendBackForChanges}
                  onVoid={onVoid}
                />
              ))
            )}
          </div>
        )}

        {!loading &&
          entriesCount === 0 &&
          activeFilterCount === 0 &&
          !employeeSearch.trim() && (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-2 text-4xl">⏱️</div>

              <h2 className="text-xl font-bold">Ingen tidsregistreringer</h2>

              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Der er ingen registreringer at godkende lige nu.
              </p>
            </div>
          )}
      </div>
    </main>
  );
}
