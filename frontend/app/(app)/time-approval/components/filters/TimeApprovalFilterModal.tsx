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
  onShowPendingChange: (
    value: boolean,
  ) => void;
  onShowNeedsChangesChange: (
    value: boolean,
  ) => void;
  onShowApprovedChange: (
    value: boolean,
  ) => void;
  onShowVoidedChange: (
    value: boolean,
  ) => void;
  onShowPlannedEntriesChange: (
    value: boolean,
  ) => void;
  onShowManualEntriesChange: (
    value: boolean,
  ) => void;
  onOnlyWithDeviationsChange: (
    value: boolean,
  ) => void;
  onOnlyWithNotesChange: (
    value: boolean,
  ) => void;
  onDateFromChange: (
    value: string,
  ) => void;
  onDateToChange: (
    value: string,
  ) => void;
};

function optionClass(
  selected: boolean,
) {
  return `flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 dark:focus-within:ring-blue-400 dark:focus-within:ring-offset-gray-900 ${
    selected
      ? "border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100"
      : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-100 dark:hover:bg-gray-950"
  }`;
}

const checkboxClass =
  "h-4 w-4 rounded border-gray-300 accent-blue-700 dark:border-gray-600 dark:accent-blue-400";

const dateFieldClass =
  "mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/25";

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
      activeFilterCount={
        activeFilterCount
      }
      onApply={onApply}
      onClose={onClose}
      onReset={onReset}
    >
      <div className="space-y-6 text-gray-900 dark:text-gray-100">
        <section>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Status
          </h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <label
              className={optionClass(
                showPending,
              )}
            >
              <input
                type="checkbox"
                checked={showPending}
                onChange={(event) =>
                  onShowPendingChange(
                    event.target.checked,
                  )
                }
                className={
                  checkboxClass
                }
              />
              Afventer godkendelse (
              {pendingCount})
            </label>

            <label
              className={optionClass(
                showNeedsChanges,
              )}
            >
              <input
                type="checkbox"
                checked={
                  showNeedsChanges
                }
                onChange={(event) =>
                  onShowNeedsChangesChange(
                    event.target.checked,
                  )
                }
                className={
                  checkboxClass
                }
              />
              Sendt retur (
              {needsChangesCount})
            </label>

            <label
              className={optionClass(
                showApproved,
              )}
            >
              <input
                type="checkbox"
                checked={showApproved}
                onChange={(event) =>
                  onShowApprovedChange(
                    event.target.checked,
                  )
                }
                className={
                  checkboxClass
                }
              />
              Godkendte (
              {approvedCount})
            </label>

            <label
              className={optionClass(
                showVoided,
              )}
            >
              <input
                type="checkbox"
                checked={showVoided}
                onChange={(event) =>
                  onShowVoidedChange(
                    event.target.checked,
                  )
                }
                className={
                  checkboxClass
                }
              />
              Annullerede (
              {voidedCount})
            </label>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Registreringstype
          </h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <label
              className={optionClass(
                showPlannedEntries,
              )}
            >
              <input
                type="checkbox"
                checked={
                  showPlannedEntries
                }
                onChange={(event) =>
                  onShowPlannedEntriesChange(
                    event.target.checked,
                  )
                }
                className={
                  checkboxClass
                }
              />
              Planlagte vagter
            </label>

            <label
              className={optionClass(
                showManualEntries,
              )}
            >
              <input
                type="checkbox"
                checked={
                  showManualEntries
                }
                onChange={(event) =>
                  onShowManualEntriesChange(
                    event.target.checked,
                  )
                }
                className={
                  checkboxClass
                }
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
            <label
              className={optionClass(
                onlyWithDeviations,
              )}
            >
              <input
                type="checkbox"
                checked={
                  onlyWithDeviations
                }
                onChange={(event) =>
                  onOnlyWithDeviationsChange(
                    event.target.checked,
                  )
                }
                className={
                  checkboxClass
                }
              />
              Kun registreringer med
              afvigelser
            </label>

            <label
              className={optionClass(
                onlyWithNotes,
              )}
            >
              <input
                type="checkbox"
                checked={onlyWithNotes}
                onChange={(event) =>
                  onOnlyWithNotesChange(
                    event.target.checked,
                  )
                }
                className={
                  checkboxClass
                }
              />
              Kun registreringer med
              noter
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
                onChange={(event) =>
                  onDateFromChange(
                    event.target.value,
                  )
                }
                className={
                  dateFieldClass
                }
              />
            </label>

            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Til

              <input
                type="date"
                value={dateTo}
                onChange={(event) =>
                  onDateToChange(
                    event.target.value,
                  )
                }
                className={
                  dateFieldClass
                }
              />
            </label>
          </div>
        </section>
      </div>
    </FilterModal>
  );
}
