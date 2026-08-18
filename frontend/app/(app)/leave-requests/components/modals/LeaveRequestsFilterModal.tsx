import ProjectDatePicker from "@/app/components/date/ProjectDatePicker";
import FilterModal from "@/app/components/modals/FilterModal";

import type { LeaveStatusFilters } from "../../helpers/core/leaveRequestTypes";


const checkboxClass =
  "mt-0.5 h-4 w-4 shrink-0 accent-blue-600 dark:accent-blue-500";

type LeaveRequestsFilterModalProps = {
  activeFilterCount: number;
  draftFilterEndDate: string;
  draftFilterStartDate: string;
  draftStatusFilters: LeaveStatusFilters;
  open: boolean;
  onApply: () => void;
  onClose: () => void;
  onReset: () => void;
  onSetDraftFilterEndDate: (value: string) => void;
  onSetDraftFilterStartDate: (value: string) => void;
  onUpdateDraftStatusFilter: (
    key: keyof LeaveStatusFilters,
    checked: boolean,
  ) => void;
};

const statusOptions: Array<{
  key: keyof LeaveStatusFilters;
  label: string;
  description: string;
}> = [
  {
    key: "pending",
    label: "Afventer",
    description: "Ansøgninger der endnu ikke er behandlet.",
  },
  {
    key: "approved",
    label: "Godkendte",
    description: "Fravær der er godkendt.",
  },
  {
    key: "rejected",
    label: "Afviste",
    description: "Ansøgninger der er afvist.",
  },
  {
    key: "cancelled",
    label: "Annullerede",
    description: "Ansøgninger der er annulleret.",
  },
  {
    key: "expired",
    label: "Udløbne",
    description:
      "Ansøgninger der ikke blev behandlet, før fraværsperioden begyndte.",
  },
];

export default function LeaveRequestsFilterModal({
  activeFilterCount,
  draftFilterEndDate,
  draftFilterStartDate,
  draftStatusFilters,
  open,
  onApply,
  onClose,
  onReset,
  onSetDraftFilterEndDate,
  onSetDraftFilterStartDate,
  onUpdateDraftStatusFilter,
}: LeaveRequestsFilterModalProps) {
  return (
    <FilterModal
      open={open}
      title="Filter"
      activeFilterCount={activeFilterCount}
      applyText="Vis ansøgninger"
      resetText="Nulstil filter"
      onApply={onApply}
      onReset={onReset}
      onClose={onClose}
    >
      <div className="space-y-5 text-gray-900 dark:text-gray-100">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Vælg hvilke fraværsansøgninger du vil se.
        </p>

        <div>
          <h3 className="text-sm font-semibold text-gray-950 dark:text-white">
            Status
          </h3>
          <div className="mt-3 space-y-3">
            {statusOptions.map((option) => {
              const checked = draftStatusFilters[option.key];

              return (
                <label
                  key={option.key}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 dark:focus-within:ring-blue-400 dark:focus-within:ring-offset-gray-900 ${
                    checked
                      ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40"
                      : "border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      onUpdateDraftStatusFilter(option.key, event.target.checked)
                    }
                    className={checkboxClass}
                  />
                  <span>
                    <span className="block font-medium text-gray-950 dark:text-white">
                      {option.label}
                    </span>
                    <span className="block text-xs text-gray-600 dark:text-gray-400">
                      {option.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-950 dark:text-white">
            Periode
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="block text-sm text-gray-800 dark:text-gray-200">
              <div className="font-medium">
                Fra dato
              </div>
              <ProjectDatePicker
                value={draftFilterStartDate}
                onChange={onSetDraftFilterStartDate}
                clearable
                className="mt-1"
                ariaLabel={"V\u00e6lg fra dato"}
              />
            </div>
            <div className="block text-sm text-gray-800 dark:text-gray-200">
              <div className="font-medium">
                Til dato
              </div>
              <ProjectDatePicker
                value={draftFilterEndDate}
                onChange={onSetDraftFilterEndDate}
                clearable
                className="mt-1"
                ariaLabel={"V\u00e6lg til dato"}
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            Datofilteret viser ansøgninger, der overlapper den valgte periode.
          </p>
        </div>
      </div>
    </FilterModal>
  );
}
