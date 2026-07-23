"use client";

import FilterModal from "@/app/components/modals/FilterModal";

import type {
  LeaveStatusFilters,
} from "../../helpers/core/leaveApprovalTypes";

type LeaveApprovalFilterModalProps = {
  open: boolean;
  activeFilterCount: number;
  draftStatusFilters:
    LeaveStatusFilters;
  draftStartDateFilter: string;
  draftEndDateFilter: string;
  onStatusFilterChange: (
    key: keyof LeaveStatusFilters,
    checked: boolean,
  ) => void;
  onStartDateFilterChange: (
    value: string,
  ) => void;
  onEndDateFilterChange: (
    value: string,
  ) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
};

const optionClass =
  "flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 transition hover:bg-gray-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-100 dark:hover:bg-gray-950 dark:focus-within:ring-blue-400 dark:focus-within:ring-offset-gray-900";

const checkboxClass =
  "mt-0.5 h-4 w-4 rounded border-gray-300 accent-blue-700 dark:border-gray-600 dark:accent-blue-400";

const dateFieldClass =
  "mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/25";

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
  const statusOptions = [
    {
      key: "pending",
      label: "Afventer",
      description:
        "Ansøgninger der kræver behandling.",
    },
    {
      key: "expired",
      label: "Udløbne",
      description:
        "Ansøgninger der ikke blev behandlet, før fraværet begyndte.",
    },
    {
      key: "approved",
      label: "Godkendte",
      description:
        "Ansøgninger der allerede er godkendt.",
    },
    {
      key: "rejected",
      label: "Afviste",
      description:
        "Ansøgninger der er blevet afvist.",
    },
    {
      key: "cancelled",
      label: "Annullerede",
      description:
        "Ansøgninger der er blevet annulleret.",
    },
  ] as const;

  return (
    <FilterModal
      open={open}
      title="Filtrer fraværsansøgninger"
      activeFilterCount={
        activeFilterCount
      }
      applyText="Vis ansøgninger"
      resetText="Nulstil filter"
      onApply={onApply}
      onReset={onReset}
      onClose={onClose}
    >
      <div className="space-y-5 text-gray-900 dark:text-gray-100">
        <div>
          <h3 className="text-sm font-semibold text-gray-950 dark:text-white">
            Status
          </h3>

          <div className="mt-3 space-y-3">
            {statusOptions.map(
              (option) => (
                <label
                  key={option.key}
                  className={
                    optionClass
                  }
                >
                  <input
                    type="checkbox"
                    checked={
                      draftStatusFilters[
                        option.key
                      ]
                    }
                    onChange={(
                      event,
                    ) =>
                      onStatusFilterChange(
                        option.key,
                        event.target
                          .checked,
                      )
                    }
                    className={
                      checkboxClass
                    }
                  />

                  <span>
                    <span className="block font-medium text-gray-950 dark:text-white">
                      {
                        option.label
                      }
                    </span>

                    <span className="block text-xs text-gray-600 dark:text-gray-400">
                      {
                        option.description
                      }
                    </span>
                  </span>
                </label>
              ),
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-950 dark:text-white">
            Periode
          </h3>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-gray-800 dark:text-gray-200">
              <span className="font-medium">
                Fra dato
              </span>

              <input
                type="date"
                value={
                  draftStartDateFilter
                }
                onChange={(event) =>
                  onStartDateFilterChange(
                    event.target.value,
                  )
                }
                className={
                  dateFieldClass
                }
              />
            </label>

            <label className="block text-sm text-gray-800 dark:text-gray-200">
              <span className="font-medium">
                Til dato
              </span>

              <input
                type="date"
                value={
                  draftEndDateFilter
                }
                onChange={(event) =>
                  onEndDateFilterChange(
                    event.target.value,
                  )
                }
                className={
                  dateFieldClass
                }
              />
            </label>
          </div>

          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            Datofilteret viser
            ansøgninger, der overlapper
            den valgte periode.
          </p>
        </div>
      </div>
    </FilterModal>
  );
}
