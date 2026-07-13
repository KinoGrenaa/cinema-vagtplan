import FilterModal from "@/app/components/modals/FilterModal";

import type { LeaveStatusFilters } from "../../helpers/core/leaveRequestTypes";

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-white dark:focus:ring-white/10";

const labelClass =
  "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";

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
      <div className="space-y-5">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Vælg hvilke fraværsansøgninger du vil se.
        </p>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Status
          </h3>

          <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
            <input
              type="checkbox"
              checked={draftStatusFilters.pending}
              onChange={(event) =>
                onUpdateDraftStatusFilter("pending", event.target.checked)
              }
              className="mt-0.5 h-4 w-4"
            />
            <span>
              <span className="block font-medium">Afventer</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                Ansøgninger der endnu ikke er behandlet.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
            <input
              type="checkbox"
              checked={draftStatusFilters.approved}
              onChange={(event) =>
                onUpdateDraftStatusFilter("approved", event.target.checked)
              }
              className="mt-0.5 h-4 w-4"
            />
            <span>
              <span className="block font-medium">Godkendte</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                Fravær der er godkendt.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
            <input
              type="checkbox"
              checked={draftStatusFilters.rejected}
              onChange={(event) =>
                onUpdateDraftStatusFilter("rejected", event.target.checked)
              }
              className="mt-0.5 h-4 w-4"
            />
            <span>
              <span className="block font-medium">Afviste</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                Ansøgninger der er afvist.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
            <input
              type="checkbox"
              checked={draftStatusFilters.cancelled}
              onChange={(event) =>
                onUpdateDraftStatusFilter("cancelled", event.target.checked)
              }
              className="mt-0.5 h-4 w-4"
            />
            <span>
              <span className="block font-medium">Annullerede</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                Ansøgninger der er annulleret.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
            <input
              type="checkbox"
              checked={draftStatusFilters.expired}
              onChange={(event) =>
                onUpdateDraftStatusFilter("expired", event.target.checked)
              }
              className="mt-0.5 h-4 w-4"
            />
            <span>
              <span className="block font-medium">Udløbne</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                Ansøgninger der ikke blev behandlet, før fraværsperioden begyndte.
              </span>
            </span>
          </label>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Periode
          </h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Fra dato</label>
              <input
                type="date"
                className={inputClass}
                value={draftFilterStartDate}
                onChange={(event) =>
                  onSetDraftFilterStartDate(event.target.value)
                }
              />
            </div>

            <div>
              <label className={labelClass}>Til dato</label>
              <input
                type="date"
                className={inputClass}
                value={draftFilterEndDate}
                onChange={(event) =>
                  onSetDraftFilterEndDate(event.target.value)
                }
              />
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Datofilteret viser ansøgninger, der overlapper den valgte periode.
          </p>
        </div>
      </div>
    </FilterModal>
  );
}
