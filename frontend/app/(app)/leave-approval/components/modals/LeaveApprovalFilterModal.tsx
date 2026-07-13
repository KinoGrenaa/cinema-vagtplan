"use client";

import FilterModal from "@/app/components/modals/FilterModal";

import type { LeaveStatusFilters } from "../../helpers/core/leaveApprovalTypes";

type LeaveApprovalFilterModalProps = {
  open: boolean;
  activeFilterCount: number;
  draftStatusFilters: LeaveStatusFilters;
  draftStartDateFilter: string;
  draftEndDateFilter: string;
  onStatusFilterChange: (
    key: keyof LeaveStatusFilters,
    checked: boolean,
  ) => void;
  onStartDateFilterChange: (value: string) => void;
  onEndDateFilterChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
};

export default function LeaveApprovalFilterModal({
  open,
  activeFilterCount,
  draftStatusFilters,
  draftStartDateFilter,
  draftEndDateFilter,
  onStatusFilterChange,
  onStartDateFilterChange,
  onEndDateFilterChange,
  onApply,
  onReset,
  onClose,
}: LeaveApprovalFilterModalProps) {
  return (
    <FilterModal
      open={open}
      title="Filtrer fraværsansøgninger"
      activeFilterCount={activeFilterCount}
      applyText="Vis ansøgninger"
      resetText="Nulstil filter"
      onApply={onApply}
      onReset={onReset}
      onClose={onClose}
    >
      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Status
          </h3>
          <div className="mt-3 space-y-3">
            <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
              <input
                type="checkbox"
                checked={draftStatusFilters.pending}
                onChange={(event) =>
                  onStatusFilterChange("pending", event.target.checked)
                }
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block font-medium">Afventer</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  Ansøgninger der kræver behandling.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
              <input
                type="checkbox"
                checked={draftStatusFilters.expired}
                onChange={(event) =>
                  onStatusFilterChange("expired", event.target.checked)
                }
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block font-medium">Udløbne</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  Ansøgninger der ikke blev behandlet, før fraværet begyndte.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
              <input
                type="checkbox"
                checked={draftStatusFilters.approved}
                onChange={(event) =>
                  onStatusFilterChange("approved", event.target.checked)
                }
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block font-medium">Godkendte</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  Ansøgninger der allerede er godkendt.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
              <input
                type="checkbox"
                checked={draftStatusFilters.rejected}
                onChange={(event) =>
                  onStatusFilterChange("rejected", event.target.checked)
                }
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block font-medium">Afviste</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  Ansøgninger der er blevet afvist.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
              <input
                type="checkbox"
                checked={draftStatusFilters.cancelled}
                onChange={(event) =>
                  onStatusFilterChange("cancelled", event.target.checked)
                }
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block font-medium">Annullerede</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  Ansøgninger der er blevet annulleret.
                </span>
              </span>
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Periode
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium">Fra dato</span>
              <input
                type="date"
                value={draftStartDateFilter}
                onChange={(event) =>
                  onStartDateFilterChange(event.target.value)
                }
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Til dato</span>
              <input
                type="date"
                value={draftEndDateFilter}
                onChange={(event) => onEndDateFilterChange(event.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Datofilteret viser ansøgninger, der overlapper den valgte periode.
          </p>
        </div>
      </div>
    </FilterModal>
  );
}
