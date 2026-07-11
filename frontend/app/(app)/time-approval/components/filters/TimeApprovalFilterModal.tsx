"use client";

import FilterModal from "@/app/components/modals/FilterModal";

type TimeApprovalFilterModalProps = {
  open: boolean;
  activeFilterCount: number;
  pendingCount: number;
  needsChangesCount: number;
  approvedCount: number;
  voidedCount: number;
  showPending: boolean;
  showNeedsChanges: boolean;
  showApproved: boolean;
  showVoided: boolean;
  showPlannedEntries: boolean;
  showManualEntries: boolean;
  onlyWithDeviations: boolean;
  onlyWithNotes: boolean;
  dateFrom: string;
  dateTo: string;
  onApply: () => void;
  onClose: () => void;
  onReset: () => void;
  onShowPendingChange: (value: boolean) => void;
  onShowNeedsChangesChange: (value: boolean) => void;
  onShowApprovedChange: (value: boolean) => void;
  onShowVoidedChange: (value: boolean) => void;
  onShowPlannedEntriesChange: (value: boolean) => void;
  onShowManualEntriesChange: (value: boolean) => void;
  onOnlyWithDeviationsChange: (value: boolean) => void;
  onOnlyWithNotesChange: (value: boolean) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
};

export default function TimeApprovalFilterModal({
  open,
  activeFilterCount,
  pendingCount,
  needsChangesCount,
  approvedCount,
  voidedCount,
  showPending,
  showNeedsChanges,
  showApproved,
  showVoided,
  showPlannedEntries,
  showManualEntries,
  onlyWithDeviations,
  onlyWithNotes,
  dateFrom,
  dateTo,
  onApply,
  onClose,
  onReset,
  onShowPendingChange,
  onShowNeedsChangesChange,
  onShowApprovedChange,
  onShowVoidedChange,
  onShowPlannedEntriesChange,
  onShowManualEntriesChange,
  onOnlyWithDeviationsChange,
  onOnlyWithNotesChange,
  onDateFromChange,
  onDateToChange,
}: TimeApprovalFilterModalProps) {
  return (
    <FilterModal
      open={open}
      title="Filtre"
      activeFilterCount={activeFilterCount}
      onApply={onApply}
      onClose={onClose}
      onReset={onReset}
    >
      <div className="space-y-6">
        <section>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Status
          </h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
              <input
                type="checkbox"
                checked={showPending}
                onChange={(event) =>
                  onShowPendingChange(event.target.checked)
                }
                className="h-4 w-4"
              />
              Afventer godkendelse ({pendingCount})
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
              <input
                type="checkbox"
                checked={showNeedsChanges}
                onChange={(event) =>
                  onShowNeedsChangesChange(event.target.checked)
                }
                className="h-4 w-4"
              />
              Sendt retur ({needsChangesCount})
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
              <input
                type="checkbox"
                checked={showApproved}
                onChange={(event) =>
                  onShowApprovedChange(event.target.checked)
                }
                className="h-4 w-4"
              />
              Godkendte ({approvedCount})
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
              <input
                type="checkbox"
                checked={showVoided}
                onChange={(event) => onShowVoidedChange(event.target.checked)}
                className="h-4 w-4"
              />
              Annullerede ({voidedCount})
            </label>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Registreringstype
          </h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
              <input
                type="checkbox"
                checked={showPlannedEntries}
                onChange={(event) =>
                  onShowPlannedEntriesChange(event.target.checked)
                }
                className="h-4 w-4"
              />
              Planlagte vagter
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
              <input
                type="checkbox"
                checked={showManualEntries}
                onChange={(event) =>
                  onShowManualEntriesChange(event.target.checked)
                }
                className="h-4 w-4"
              />
              Manuelle registreringer
            </label>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Indhold
          </h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
              <input
                type="checkbox"
                checked={onlyWithDeviations}
                onChange={(event) =>
                  onOnlyWithDeviationsChange(event.target.checked)
                }
                className="h-4 w-4"
              />
              Kun registreringer med afvigelser
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
              <input
                type="checkbox"
                checked={onlyWithNotes}
                onChange={(event) =>
                  onOnlyWithNotesChange(event.target.checked)
                }
                className="h-4 w-4"
              />
              Kun registreringer med noter
            </label>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Dato
          </h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Fra
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => onDateFromChange(event.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-900"
              />
            </label>

            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Til
              <input
                type="date"
                value={dateTo}
                onChange={(event) => onDateToChange(event.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-900"
              />
            </label>
          </div>
        </section>
      </div>
    </FilterModal>
  );
}
